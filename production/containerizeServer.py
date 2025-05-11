import os
import subprocess
from dotenv import load_dotenv
#USER OPTIONS HERE!!
#server_type is either "BACKEND" or "MEDIA_SERVER"
server_type = "BACKEND"
push_to_GitLab = False
#Choose a tag for your image (e.g., 'latest', 'v1.0')
version_tag = "v1.0"
# --- Configuration ---
if server_type == "BACKEND":
    #PORTFOLIO BACKEND
    IMAGE_NAME = "registry.gitlab.com/8jk.ang8/portfolio/backend"
    IMAGE_TAG = version_tag
    CONTAINER_NAME = "Portfolio_Backend"  # Choose a name for running container
    HOST_PORT = 3000  # The port on your host machine
    CONTAINER_PORT = 3000  # The port your application inside the container listens on (as EXPOSED in Dockerfile)
    DOCKERFILE_PATH = "./backend_bun"  # Path to the DIRECTORY containing your Dockerfile.
elif server_type == "MEDIA_SERVER":
    #PORTFOLIO MEDIA_SERVER
    IMAGE_NAME = "registry.gitlab.com/8jk.ang8/portfolio/media_server"
    IMAGE_TAG = version_tag
    CONTAINER_NAME = "Portfolio_Media_Server"  # Choose a name for running container
    HOST_PORT = 2121  # The port on your host machine
    CONTAINER_PORT = 2121  # The port your application inside the container listens on (as EXPOSED in Dockerfile)
    DOCKERFILE_PATH = "./mediaserver"  # Path to the DIRECTORY containing your Dockerfile.

else:
    print("INVALID server_type!")
    exit()
load_dotenv()
gitlab_username=os.getenv("GITLAB_USERNAME")
gitlab_password = os.getenv("GITLAB_PASSWORD")

# --- Function to Run Shell Commands ---
def run_command(command, cwd=None):
    """
    Runs a shell command and prints its output.
    Raises an exception if the command fails.
    """
    print(f"Executing command: {' '.join(command)}")
    try:
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, cwd=cwd)
        stdout, stderr = process.communicate()

        if process.returncode == 0:
            print("Command executed successfully.")
            if stdout:
                print("Output:\n", stdout)
        else:
            print(f"Error executing command. Return code: {process.returncode}")
            if stdout:
                print("Stdout:\n", stdout)
            if stderr:
                print("Stderr:\n", stderr)
            raise subprocess.CalledProcessError(process.returncode, command, output=stdout, stderr=stderr)
        return stdout
    except FileNotFoundError:
        print(f"Error: The command '{command[0]}' was not found. Make sure Docker is installed and in your PATH.")
        raise
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise


# --- Main Script ---
if __name__ == "__main__":
    full_image_name = f"{IMAGE_NAME}:{IMAGE_TAG}"
    print(gitlab_username)
    print(gitlab_password)
    # 1. Login to GitLab Registry
    print(f"\nLogging in to GitLab...")
    #TODO turn username and password into environment variables and makes sure they arent pushed to gituhb
    login_command_args = [
        "docker", "login",
        "registry.gitlab.com",
        "--username", gitlab_username,
        "--password", gitlab_password
    ]
    try:
        login = run_command(login_command_args)  # docker run in detached mode outputs the container ID
        print(f"Successfully logged in to GitLab!")
    except Exception as e:
        print(f"Failed to login: {e}")
        exit(1)



    # 1. Build the Docker Image
    print(f"\n--- Building Docker Image: {full_image_name} ---")
    build_command = [
        "docker", "build",
        "--platform", "linux/amd64",
        "-t", full_image_name,
        DOCKERFILE_PATH
    ]
    try:
        run_command(build_command)
        print(f"Image '{full_image_name}' built successfully.")
    except Exception as e:
        print(f"Failed to build Docker image: {e}")
        exit(1)

    # 2. Push To GitLab if user set flag to True
    if push_to_GitLab:
        print(f"\n--- Pushing {full_image_name} Image To GitLab ---")
        run_command_args = [
            "docker", "push",
          full_image_name
        ]
        try:
            push_id = run_command(run_command_args)  # docker run in detached mode outputs the container ID
            print(f"Successfully pushed image to GitLab!")

        except Exception as e:
            print(f"Failed to push image: {e}")
            exit(1)

    # 3. Stop and Remove any existing container with the same name
    print(f"\n--- Checking for existing container: {CONTAINER_NAME} ---")
    stop_command = ["docker", "stop", CONTAINER_NAME]
    remove_command = ["docker", "rm", CONTAINER_NAME]

    try:
        # Try to stop the container, ignore error if it doesn't exist
        print(f"Attempting to stop container '{CONTAINER_NAME}' if it exists...")
        subprocess.run(stop_command, check=False, capture_output=True, text=True)
        print(f"Attempting to remove container '{CONTAINER_NAME}' if it exists...")
        subprocess.run(remove_command, check=False, capture_output=True, text=True)
        print("Cleanup of existing container (if any) complete.")
    except Exception as e:
        # This might happen if docker command itself is not found, handled by run_command later
        print(f"Could not stop/remove existing container (it might not exist, or Docker is not running): {e}")

    # 4. Run the Docker Image
    # print(f"\n--- Running Docker Container: {CONTAINER_NAME} from image {full_image_name} ---")
    # run_command_args = [
    #     "docker", "run",
    #     "--detach",  # Run in detached mode (in the background)
    #     "-p", f"{HOST_PORT}:{CONTAINER_PORT}",  # Map host port to container port
    #     "--name", CONTAINER_NAME,  # Assign a name to the container
    #     full_image_name
    # ]
    # try:
    #     container_id = run_command(run_command_args)  # docker run in detached mode outputs the container ID
    #     print(f"Container '{CONTAINER_NAME}' started successfully.")
    #     print(f"Application should be accessible on http://localhost:{HOST_PORT}")
    #     print(f"To see logs: docker logs {CONTAINER_NAME}")
    # except Exception as e:
    #     print(f"Failed to run Docker container: {e}")
    #     exit(1)

    print("\n--- Script Finished ---")