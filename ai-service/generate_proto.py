import subprocess
import sys
import os


def generate_proto():
    proto_dir = os.path.join(os.path.dirname(__file__), "app", "grpc_proto")
    proto_file = os.path.join(proto_dir, "recognition.proto")
    project_root = os.path.dirname(__file__)

    cmd = [
        sys.executable, "-m", "grpc_tools.protoc",
        f"-I{project_root}",
        f"--python_out={project_root}",
        f"--grpc_python_out={project_root}",
        proto_file,
    ]

    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        sys.exit(1)

    print("Proto files generated successfully.")
    print(f"  -> {os.path.join(proto_dir, 'recognition_pb2.py')}")
    print(f"  -> {os.path.join(proto_dir, 'recognition_pb2_grpc.py')}")


if __name__ == "__main__":
    generate_proto()
