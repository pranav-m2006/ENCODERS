"""
CLI for FloodOps administration and recovery tasks.
Usage:
  python -m app.cli rebuild-projections
"""
import sys
from app.models.models import SessionLocal
from app.services.sync import rebuild_all_projections

def main():
    if len(sys.argv) < 2:
        print("Usage: python -m app.cli [rebuild-projections]")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "rebuild-projections":
        print("[FloodOps CLI] Rebuilding projections from immutable event log...")
        db = SessionLocal()
        try:
            rebuild_all_projections(db)
            print("[FloodOps CLI] Successfully rebuilt all projections!")
        finally:
            db.close()
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)

if __name__ == "__main__":
    main()
