"""
Real-Time Leaf Detection using YOLOv8 + OpenCV
================================================

INSTALLATION (run these commands first):
-----------------------------------------
  pip install ultralytics
  pip install opencv-python
  pip install torch torchvision torchaudio

  For CUDA GPU acceleration (optional, Windows/Linux):
    Visit https://pytorch.org/get-started/locally/ and pick your CUDA version.

  For Raspberry Pi (CPU only):
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

MODEL NOTES:
------------
  YOLOv8 standard models are trained on the COCO dataset, which does NOT include
  a "leaf" class. This program supports two modes:

  Mode A — Custom leaf model (recommended for best accuracy):
    1. Train your own model or download a leaf-detection model.
    2. Save it as 'leaf_model.pt' in the same folder as this script, OR
       pass the path via --model argument:
         python leaf_detection.py --model /path/to/leaf_model.pt

    Free leaf datasets to train on:
      - PlantVillage Dataset (Kaggle)
      - iNaturalist leaf subset
      - Roboflow Universe: "leaf detection" (roboflow.com/universe)

  Mode B — Fallback (no custom model):
    Uses yolov8n.pt (COCO) and marks COCO class 58 "potted plant" as proxy.
    Accuracy for wild/outdoor leaves is low in this mode.

USAGE:
------
  python leaf_detection.py                        # auto-detects model
  python leaf_detection.py --model leaf_model.pt  # explicit model path
  python leaf_detection.py --cam 1                # use second camera
  python leaf_detection.py --width 640 --height 480
  python leaf_detection.py --conf 0.35            # confidence threshold

CONTROLS:
---------
  q — quit
  s — save current frame as snapshot
  p — pause / resume
  + / -  — increase / decrease confidence threshold
"""

import argparse
import os
import sys
import time
from pathlib import Path

import cv2
import numpy as np

# ── Dependency check ──────────────────────────────────────────────────────────

try:
    from ultralytics import YOLO
except ImportError:
    sys.exit(
        "[ERROR] 'ultralytics' not found.\n"
        "Install it with:  pip install ultralytics"
    )

try:
    import torch
except ImportError:
    sys.exit(
        "[ERROR] 'torch' not found.\n"
        "Install it with:  pip install torch"
    )

# ── Constants ─────────────────────────────────────────────────────────────────

SCRIPT_DIR      = Path(__file__).parent
DEFAULT_MODEL   = SCRIPT_DIR / "leaf_model.pt"
FALLBACK_MODEL  = "yolov8n.pt"          # downloaded automatically if missing
COCO_PLANT_IDS  = {58}                  # "potted plant" in COCO — fallback only
LEAF_COLOR      = (50, 205, 50)         # green bounding box
TEXT_COLOR      = (255, 255, 255)       # white label text
BOX_THICKNESS   = 2
FONT            = cv2.FONT_HERSHEY_SIMPLEX
FONT_SCALE      = 0.55
FONT_THICKNESS  = 1

# ── CLI arguments ─────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(description="Real-time leaf detection with YOLOv8")
    p.add_argument("--model",  type=str,   default=None,  help="Path to YOLO model weights (.pt)")
    p.add_argument("--cam",    type=int,   default=0,     help="Camera index (default: 0)")
    p.add_argument("--width",  type=int,   default=640,   help="Capture width  (default: 640)")
    p.add_argument("--height", type=int,   default=480,   help="Capture height (default: 480)")
    p.add_argument("--conf",   type=float, default=0.40,  help="Confidence threshold 0-1 (default: 0.40)")
    p.add_argument("--skip",   type=int,   default=1,     help="Run inference every N frames (default: 1, use 2-3 on RPi)")
    return p.parse_args()

# ── Model loader ──────────────────────────────────────────────────────────────

def load_model(model_arg):
    """
    Priority:
      1. --model CLI argument
      2. leaf_model.pt sitting next to this script
      3. yolov8n.pt (COCO fallback, auto-downloaded)
    Returns (model, is_custom_leaf_model: bool)
    """
    if model_arg:
        path = Path(model_arg)
        if not path.exists():
            sys.exit(f"[ERROR] Model not found: {path}")
        print(f"[INFO] Loading custom model: {path}")
        return YOLO(str(path)), True

    if DEFAULT_MODEL.exists():
        print(f"[INFO] Found leaf_model.pt — loading custom leaf model.")
        return YOLO(str(DEFAULT_MODEL)), True

    print("[WARN] No leaf_model.pt found. Falling back to yolov8n (COCO).")
    print("[WARN] Only 'potted plant' class will be used as a leaf proxy.")
    print("[WARN] For better results, supply a custom leaf model (see file header).\n")
    return YOLO(FALLBACK_MODEL), False

# ── Drawing helpers ───────────────────────────────────────────────────────────

def draw_box(frame, box, label, conf):
    x1, y1, x2, y2 = map(int, box)
    cv2.rectangle(frame, (x1, y1), (x2, y2), LEAF_COLOR, BOX_THICKNESS)

    tag    = f"Leaf  {conf:.0%}"
    (tw, th), baseline = cv2.getTextSize(tag, FONT, FONT_SCALE, FONT_THICKNESS)
    tag_y  = max(y1 - 6, th + 4)

    # filled label background
    cv2.rectangle(frame,
                  (x1, tag_y - th - baseline - 2),
                  (x1 + tw + 6, tag_y + 2),
                  LEAF_COLOR, cv2.FILLED)
    cv2.putText(frame, tag, (x1 + 3, tag_y - baseline),
                FONT, FONT_SCALE, TEXT_COLOR, FONT_THICKNESS, cv2.LINE_AA)


def draw_hud(frame, fps, conf_thresh, paused, count):
    h, w = frame.shape[:2]
    lines = [
        f"FPS: {fps:.1f}",
        f"Conf: {conf_thresh:.0%}",
        f"Leaves: {count}",
        "q=quit  s=snap  p=pause  +/-=conf",
    ]
    if paused:
        cv2.putText(frame, "PAUSED", (w // 2 - 60, h // 2),
                    FONT, 1.4, (0, 0, 255), 2, cv2.LINE_AA)

    for i, line in enumerate(lines):
        y = 22 + i * 22
        cv2.putText(frame, line, (8, y), FONT, 0.5,
                    (0, 0, 0), 3, cv2.LINE_AA)          # shadow
        cv2.putText(frame, line, (8, y), FONT, 0.5,
                    (220, 255, 220), 1, cv2.LINE_AA)    # text

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    args = parse_args()

    # ── Load model ────────────────────────────────────────────────────────────
    model, is_leaf_model = load_model(args.model)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[INFO] Using device: {device.upper()}")

    # Warm-up inference (avoids lag on first real frame)
    dummy = np.zeros((args.height, args.width, 3), dtype=np.uint8)
    model(dummy, verbose=False)
    print("[INFO] Model warmed up.\n")

    # ── Open webcam ───────────────────────────────────────────────────────────
    cap = cv2.VideoCapture(args.cam)
    if not cap.isOpened():
        sys.exit(f"[ERROR] Cannot open camera index {args.cam}.")

    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  args.width)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, args.height)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)          # reduce latency

    print(f"[INFO] Camera {args.cam} opened at "
          f"{int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))}x"
          f"{int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))}")
    print("[INFO] Press 'q' to quit, 's' to snapshot, 'p' to pause.\n")

    # ── State ─────────────────────────────────────────────────────────────────
    conf_thresh  = args.conf
    skip_frames  = max(1, args.skip)
    paused       = False
    frame_count  = 0
    snapshot_n   = 0
    last_results = []   # cache detections between skipped frames

    fps_timer   = time.time()
    fps_display = 0.0
    fps_frames  = 0

    prev_leaf_count = 0  # track terminal print state

    window_name = "Leaf Detector — YOLOv8"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(window_name, args.width, args.height)

    # ── Loop ──────────────────────────────────────────────────────────────────
    while True:
        key = cv2.waitKey(1) & 0xFF

        # ── Keyboard controls ─────────────────────────────────────────────────
        if key == ord("q"):
            print("[INFO] Quitting.")
            break
        elif key == ord("p"):
            paused = not paused
            print("[INFO] " + ("Paused." if paused else "Resumed."))
        elif key == ord("s"):
            snap_path = SCRIPT_DIR / f"snapshot_{snapshot_n:04d}.jpg"
            cv2.imwrite(str(snap_path), frame)
            print(f"[INFO] Snapshot saved: {snap_path}")
            snapshot_n += 1
        elif key == ord("+") or key == ord("="):
            conf_thresh = min(0.95, round(conf_thresh + 0.05, 2))
            print(f"[INFO] Confidence threshold: {conf_thresh:.0%}")
        elif key == ord("-"):
            conf_thresh = max(0.05, round(conf_thresh - 0.05, 2))
            print(f"[INFO] Confidence threshold: {conf_thresh:.0%}")

        if paused:
            cv2.imshow(window_name, frame if "frame" in dir() else dummy)
            continue

        # ── Capture ───────────────────────────────────────────────────────────
        ret, frame = cap.read()
        if not ret:
            print("[WARN] Frame grab failed — retrying…")
            time.sleep(0.05)
            continue

        frame_count += 1
        fps_frames  += 1

        # FPS calculation (rolling 1-second window)
        now = time.time()
        if now - fps_timer >= 1.0:
            fps_display = fps_frames / (now - fps_timer)
            fps_frames  = 0
            fps_timer   = now

        # ── Inference (every `skip_frames` frames) ────────────────────────────
        if frame_count % skip_frames == 0:
            results = model(
                frame,
                conf=conf_thresh,
                verbose=False,
                device=device,
            )
            last_results = results

        # ── Parse detections ──────────────────────────────────────────────────
        leaf_count = 0
        for result in last_results:
            for box in result.boxes:
                cls_id = int(box.cls[0])
                conf   = float(box.conf[0])

                # Custom leaf model: treat ALL detections as "Leaf"
                # Fallback COCO model: only class 58 "potted plant"
                if is_leaf_model or cls_id in COCO_PLANT_IDS:
                    leaf_count += 1
                    draw_box(frame, box.xyxy[0], "Leaf", conf)

        # ── Terminal output ───────────────────────────────────────────────────
        if leaf_count > 0 and prev_leaf_count == 0:
            print(f"[DETECT] Leaf Detected! ({leaf_count} in frame)")
        elif leaf_count == 0 and prev_leaf_count > 0:
            print("[DETECT] No leaves in view.")
        prev_leaf_count = leaf_count

        # ── HUD overlay ───────────────────────────────────────────────────────
        draw_hud(frame, fps_display, conf_thresh, paused, leaf_count)

        cv2.imshow(window_name, frame)

    # ── Cleanup ───────────────────────────────────────────────────────────────
    cap.release()
    cv2.destroyAllWindows()
    print("[INFO] Done.")


if __name__ == "__main__":
    main()
