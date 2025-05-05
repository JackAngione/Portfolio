import os

import cv2


# TAKES IN A FOLDER OF IMAGES, DOWNSCALES THEM TO INPUT SIZE


def main():
    input_folder = r"./inputCovers"
    new_size = 500  # px
    # DON'T NEED TO CHANGE OUTPUT
    output = r"./downscaled_images"

    if not os.path.exists(output):
        os.mkdir(output)
    processed_count = 0
    for entry_name in os.listdir(input_folder):
        if entry_name == ".DS_Store":
            continue
        entry_path = os.path.join(input_folder, entry_name)
        if os.path.isfile(entry_path):
            print(f"Found file: {entry_path}")
            downscale_image(entry_path, entry_name, output, new_size)
            processed_count += 1

    print("Successfully processed ", processed_count, " images")


def downscale_image(input_path, input_name, output_folder, longest_edge_px):
    image = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
    print("shape: ", image.shape)
    width = image.shape[0]
    height = image.shape[1]

    # TODO IF IMAGE IS ALREADY TOO SMALL. should return an error
    if width < longest_edge_px and height < longest_edge_px:
        return

    if width > height:
        new_width = longest_edge_px
        scale_ratio = width / longest_edge_px
        new_height = round(height / scale_ratio)
    else:
        new_height = longest_edge_px
        scale_ratio = height / longest_edge_px
        new_width = round(width / scale_ratio)
    # AFTER EXTENSIVE TESTING, OPENCV: NEAREST IS MOST ACCURATE TO THE ORIGINAL RESOLUTION;
    # WHEN COMPARED TO OPENCV:lanczos or nearest_exact or ANY PILLOW ALGORITHM (lanczos or nearest)
    resized = cv2.resize(image, (new_height, new_width), interpolation=cv2.INTER_NEAREST)
    output_path = os.path.join(output_folder, input_name)

    cv2.imwrite(output_path, resized)


if __name__ == "__main__":
    main()
