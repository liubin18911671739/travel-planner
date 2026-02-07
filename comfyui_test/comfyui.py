#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
import time
import base64
import argparse
import io
import ast
import re
from pathlib import Path
from json import JSONDecodeError

import requests
from PIL import Image



def load_payload(payload_path: Path) -> dict:
    """
    读取 comfyui_workflow.json
    - 若文件本身已是 {"input": {...}} 结构，则直接使用
    - 若文件仅包含 workflow 节点字典，则自动包装成 {"input":{"workflow":...}}
    """
    if not payload_path.exists():
        raise FileNotFoundError(f"workflow file not found: {payload_path}")

    raw_text = payload_path.read_text(encoding="utf-8")
    try:
        data = json.loads(raw_text)
    except JSONDecodeError as exc:
        first_line = raw_text.splitlines()[0].strip() if raw_text else ""
        hint = ""
        if first_line.startswith("#!") or first_line.startswith("import "):
            hint = (
                " This file looks like a Python script, not a ComfyUI workflow JSON."
            )
        raise ValueError(
            f"Invalid workflow JSON in {payload_path}: {exc}.{hint}"
        ) from exc
    # Already wrapped payload
    if isinstance(data, dict) and "input" in data:
        return data

    # graphToPrompt-like exports (some tools save prompt as `prompt` or `output`)
    if isinstance(data, dict):
        prompt_obj = data.get("prompt")
        if isinstance(prompt_obj, dict):
            return {"input": {"workflow": prompt_obj}}

        output_obj = data.get("output")
        if isinstance(output_obj, dict):
            return {"input": {"workflow": output_obj}}

    return {"input": {"workflow": data}}


def resolve_workflow_path(workflow_arg: str) -> Path:
    """
    解析 workflow 路径：
    1) 优先使用命令行给出的路径（相对当前工作目录）
    2) 若不存在，再尝试脚本同目录下的同名文件
    """
    given = Path(workflow_arg)
    if given.exists():
        return given

    candidate = Path(__file__).resolve().parent / workflow_arg
    if candidate.exists():
        return candidate

    return given


def parse_validation_issues(error_text: str) -> list[dict]:
    """
    解析 RunPod/Comfy 的 workflow validation 错误文本，提取可自动修复的信息。
    """
    if not isinstance(error_text, str) or "Workflow validation failed" not in error_text:
        return []

    node_errors: dict[str, list[dict]] = {}
    node_class: dict[str, str] = {}

    errors_pattern = re.compile(r"^\s*• Node ([^ ]+) \(errors\): (.+)$")
    class_pattern = re.compile(r"^\s*• Node ([^ ]+) \(class_type\): (.+)$")

    for line in error_text.splitlines():
        m_err = errors_pattern.match(line)
        if m_err:
            node_id = m_err.group(1)
            raw_errors = m_err.group(2).strip()
            try:
                parsed = ast.literal_eval(raw_errors)
            except Exception:
                continue
            if isinstance(parsed, list):
                node_errors[node_id] = [e for e in parsed if isinstance(e, dict)]
            continue

        m_cls = class_pattern.match(line)
        if m_cls:
            node_class[m_cls.group(1)] = m_cls.group(2).strip()

    issues: list[dict] = []
    for node_id, errors in node_errors.items():
        for err in errors:
            extra = err.get("extra_info")
            if not isinstance(extra, dict):
                continue

            input_name = extra.get("input_name")
            if not isinstance(input_name, str):
                continue

            input_config = extra.get("input_config")
            choices: list[str] = []
            if (
                isinstance(input_config, list)
                and len(input_config) >= 1
                and isinstance(input_config[0], list)
            ):
                choices = [x for x in input_config[0] if isinstance(x, str)]

            issues.append(
                {
                    "node_id": node_id,
                    "class_type": node_class.get(node_id, "Unknown"),
                    "input_name": input_name,
                    "received_value": extra.get("received_value"),
                    "choices": choices,
                }
            )

    return issues


def apply_validation_fallbacks(payload: dict, issues: list[dict]) -> tuple[list[str], list[str]]:
    """
    对可修复的 value_not_in_list 自动回退到候选列表第一个值。
    返回 (patched_messages, missing_messages)。
    """
    workflow = payload.get("input", {}).get("workflow")
    if not isinstance(workflow, dict):
        return [], []

    patched: list[str] = []
    missing: list[str] = []

    model_dir_by_class = {
        "UNETLoader": "models/unet",
        "CLIPLoader": "models/clip",
        "VAELoader": "models/vae",
        "CheckpointLoaderSimple": "models/checkpoints",
        "DualCLIPLoader": "models/clip",
    }

    for issue in issues:
        node_id = issue.get("node_id")
        class_type = issue.get("class_type", "Unknown")
        input_name = issue.get("input_name")
        received_value = issue.get("received_value")
        choices = issue.get("choices") or []

        if not isinstance(node_id, str) or not isinstance(input_name, str):
            continue

        node = workflow.get(node_id)
        if not isinstance(node, dict):
            continue

        inputs = node.get("inputs")
        if not isinstance(inputs, dict):
            continue

        if choices:
            new_value = choices[0]
            old_value = inputs.get(input_name)
            if old_value != new_value:
                inputs[input_name] = new_value
                patched.append(
                    f"Node {node_id} ({class_type}) {input_name}: {old_value!r} -> {new_value!r}"
                )
        else:
            model_dir = model_dir_by_class.get(str(class_type), "models/<unknown>")
            missing.append(
                f"Node {node_id} ({class_type}) {input_name}: "
                f"required={received_value!r}, available=[] (put model under {model_dir})"
            )

    return patched, missing


def run_job(client: "RunPodComfyClient", payload: dict, mode: str, wait_ms: int, max_wait_s: int) -> dict:
    if mode == "runsync":
        return client.run_sync(payload, wait_ms=wait_ms)

    job = client.run_async(payload)
    job_id = job["id"]
    print(f"[INFO] submitted job id: {job_id}")
    return client.poll_until_done(job_id, max_wait_s=max_wait_s)


def patch_positive_prompt(payload: dict, prompt: str) -> int:
    """
    尝试把 workflow 里 “Positive Prompt” 的 text 替换掉。
    规则：找到 class_type=CLIPTextEncode 且 _meta.title 含 Positive 的节点。
    返回修改的节点数。
    """
    workflow = payload.get("input", {}).get("workflow", {})
    if not isinstance(workflow, dict):
        return 0

    changed = 0

    # API prompt format: {"12": {"class_type": "...", "inputs": {...}}}
    for _, node in workflow.items():
        if not isinstance(node, dict):
            continue
        if node.get("class_type") != "CLIPTextEncode":
            continue
        meta = node.get("_meta") or {}
        title = (meta.get("title") or "").lower()
        if "positive" in title:
            inputs = node.setdefault("inputs", {})
            if "text" in inputs:
                inputs["text"] = prompt
                changed += 1

    # Frontend workflow format: {"nodes":[...], "links":[...], ...}
    nodes = workflow.get("nodes")
    if isinstance(nodes, list):
        for node in nodes:
            if not isinstance(node, dict):
                continue
            if node.get("type") != "CLIPTextEncode":
                continue
            title = (node.get("title") or "").lower()
            if "positive" not in title:
                continue
            widgets = node.get("widgets_values")
            if isinstance(widgets, list) and widgets:
                widgets[0] = prompt
                changed += 1

    return changed


def sanitize_workflow(payload: dict) -> list[str]:
    """
    清理会触发旧版 worker 误判为节点的字段（例如 config/definitions）。
    返回被移除的 key 列表。
    """
    workflow = payload.get("input", {}).get("workflow")
    if not isinstance(workflow, dict):
        return []

    removed: list[str] = []

    # Frontend workflow JSON shape (cannot be sent directly to /prompt style workers)
    if isinstance(workflow.get("nodes"), list) and isinstance(workflow.get("links"), list):
        raise ValueError(
            "Detected frontend workflow JSON (contains nodes/links). "
            "This worker expects API prompt JSON. "
            "Please export `workflow_api.json` (or Save as API format) from ComfyUI and use that file."
        )

    # API prompt shape: remove non-node entries that lack class_type
    for key in list(workflow.keys()):
        value = workflow.get(key)
        if isinstance(value, dict) and "class_type" in value:
            continue
        if key.startswith("#") or key in {"config", "definitions"}:
            removed.append(key)
            workflow.pop(key, None)

    if not workflow:
        raise ValueError(
            "Workflow has no executable nodes after sanitization. "
            "Please provide an API prompt JSON export from ComfyUI."
        )

    return removed


def encode_image_data_uri(image_path: Path) -> str:
    """
    把本地图片转为 data URI base64（worker-comfyui 支持带不带 data URI 前缀）
    """
    ext = image_path.suffix.lower()
    if ext in [".jpg", ".jpeg"]:
        mime = "image/jpeg"
    else:
        mime = "image/png"
    b64 = base64.b64encode(image_path.read_bytes()).decode("utf-8")
    return f"data:{mime};base64,{b64}"


def attach_input_image(payload: dict, image_path: Path, name: str) -> None:
    """
    往 payload.input.images 里塞一张输入图。
    注意：你的 workflow 里需要用 LoadImage 等节点引用同名文件（name）。
    """
    payload.setdefault("input", {})
    payload["input"].setdefault("images", [])
    payload["input"]["images"].append(
        {"name": name, "image": encode_image_data_uri(image_path)}
    )


def extract_images_from_result(result: dict) -> list[dict]:
    """
    5.0.0+（含 5.5.1）标准输出：output.images[]，每个元素包含 type=base64|s3_url 与 data。 
    兼容旧输出 output.message（兜底）。
    """
    output = result.get("output") or {}

    images = output.get("images")
    if isinstance(images, list) and images:
        return images

    # legacy fallback
    msg = output.get("message")
    if isinstance(msg, str) and msg.strip():
        return [{"filename": "output.png", "type": "base64", "data": msg}]

    return []


def save_images(images: list[dict], outdir: Path) -> None:
    outdir.mkdir(parents=True, exist_ok=True)

    for i, item in enumerate(images, start=1):
        filename = item.get("filename") or f"image_{i:02d}.png"
        typ = (item.get("type") or "base64").lower()
        data = item.get("data") or ""

        if typ == "s3_url":
            print(f"[S3] {filename} -> {data}")
            continue

        # base64
        if "," in data:
            data = data.split(",", 1)[1]  # strip data URI prefix

        raw = base64.b64decode(data)
        img = Image.open(io.BytesIO(raw))
        outpath = outdir / filename
        img.save(outpath)
        print(f"[OK] saved -> {outpath.resolve()}")


class RunPodComfyClient:
    def __init__(self, api_key: str, endpoint_id: str):
        self.base_url = f"https://api.runpod.ai/v2/{endpoint_id}"
        self.s = requests.Session()
        self.s.headers.update(
            {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
        )

    def run_sync(self, payload: dict, wait_ms: int = 120000) -> dict:
        # /runsync 支持 ?wait=毫秒 控制最长等待时间（不是结果保留时间）
        url = f"{self.base_url}/runsync?wait={int(wait_ms)}"
        r = self.s.post(url, json=payload, timeout=max(30, wait_ms / 1000 + 10))
        r.raise_for_status()
        return r.json()

    def run_async(self, payload: dict) -> dict:
        url = f"{self.base_url}/run"
        r = self.s.post(url, json=payload, timeout=30)
        r.raise_for_status()
        return r.json()

    def status(self, job_id: str) -> dict:
        url = f"{self.base_url}/status/{job_id}"
        r = self.s.get(url, timeout=30)
        r.raise_for_status()
        return r.json()

    def poll_until_done(self, job_id: str, max_wait_s: int = 600) -> dict:
        start = time.time()
        sleep_s = 2.0

        while True:
            res = self.status(job_id)
            st = (res.get("status") or "").upper()

            if st in {"COMPLETED", "FAILED", "CANCELLED", "TIMED_OUT"}:
                return res

            if time.time() - start > max_wait_s:
                raise TimeoutError(f"Job not finished in {max_wait_s}s, last status={st}")

            time.sleep(sleep_s)
            sleep_s = min(sleep_s * 1.2, 10.0)  # 温和退避


def main():
    new_prompt = "A fashion photography work full of surreal romanticism, using a low-angle upward shooting composition, with a clear light blue sky as the background, and the visual focus concentrated on the fantasy blue vegetation and the model walking through it."
    parser = argparse.ArgumentParser()
    parser.add_argument("--workflow", default="comfyui_workflow.json", help="workflow json path")
    parser.add_argument("--mode", choices=["runsync", "async"], default="runsync", help="runsync or async(/run + /status)")
    parser.add_argument("--prompt", default=new_prompt, help="optional: overwrite positive prompt text")
    parser.add_argument("--outdir", default="outputs", help="output directory")
    parser.add_argument("--input_image", default=None, help="optional: path to an input image")
    parser.add_argument("--input_name", default=None, help="filename used inside ComfyUI input dir")
    parser.add_argument("--wait_ms", type=int, default=120000, help="runsync wait ms")
    parser.add_argument("--max_wait_s", type=int, default=600, help="async poll max wait seconds")
    args = parser.parse_args()
    
    api_key = os.getenv("RUNPOD_API_KEY")
    endpoint_id = os.getenv("ENDPOINT_ID")

    if not api_key or not endpoint_id:
        raise SystemExit("Missing env vars: RUNPOD_API_KEY / ENDPOINT_ID")

    workflow_path = resolve_workflow_path(args.workflow)
    try:
        payload = load_payload(workflow_path)
        removed_keys = sanitize_workflow(payload)
    except (FileNotFoundError, ValueError) as exc:
        raise SystemExit(str(exc)) from exc

    if removed_keys:
        print(f"[INFO] sanitized workflow keys: {', '.join(removed_keys)}")

    if args.prompt:
        changed = patch_positive_prompt(payload, args.prompt)
        print(f"[INFO] patched positive prompt nodes: {changed}")

    if args.input_image:
        attach_input_image(payload, Path(args.input_image), args.input_name)
        print(f"[INFO] attached input image: {args.input_image} as name={args.input_name}")

    client = RunPodComfyClient(api_key, endpoint_id)

    result = run_job(client, payload, args.mode, args.wait_ms, args.max_wait_s)

    # 自动修复一次 value_not_in_list（若候选非空），并重试一次
    status = (result.get("status") or "").upper()
    if status != "COMPLETED":
        issues = parse_validation_issues(result.get("error", ""))
        if issues:
            patched, missing = apply_validation_fallbacks(payload, issues)

            if patched:
                print("[INFO] auto-fixed workflow inputs:")
                for msg in patched:
                    print(f"  - {msg}")
                print("[INFO] retrying once with patched workflow...")
                result = run_job(client, payload, args.mode, args.wait_ms, args.max_wait_s)
                status = (result.get("status") or "").upper()

            if missing and status != "COMPLETED":
                print("[ERROR] endpoint model inventory is incomplete:")
                for msg in missing:
                    print(f"  - {msg}")
                print(
                    "[ERROR] fix options:\n"
                    "  1) upload/mount the required model files to the endpoint volume and restart worker\n"
                    "  2) edit workflow to use model names that actually exist on this endpoint\n"
                    "  3) switch to an endpoint with preloaded models"
                )

    # 保存完整返回，便于排错
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    (outdir / "result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    if (result.get("status") or "").upper() != "COMPLETED":
        raise SystemExit(f"Job finished with status={result.get('status')}, see {outdir/'result.json'}")

    images = extract_images_from_result(result)
    if not images:
        print("[WARN] no images found in output.")
        return

    save_images(images, outdir)


if __name__ == "__main__":

    main()
