import re

def sort_firebot_variables_exclude_invalid(file_path, output_path):
    with open(file_path, 'r') as file:
        content = file.read()

    # Match the FIREBOT_VARIABLES object and its content
    match = re.search(r"(export const FIREBOT_VARIABLES: \{ \[key: string\]: VariableDefinition \} = \{\n)([\s\S]*?)(\n\};)", content)
    if not match:
        print("FIREBOT_VARIABLES object not found.")
        return

    # Extract the non-variable sections
    pre_variables = content[:match.start()]
    variables_header, variables_body, variables_footer = match.groups()
    post_variables = content[match.end():]

    # Process the body to group complete variable blocks
    blocks = []
    current_block = []
    brace_level = 0

    for line in variables_body.splitlines(keepends=True):
        if line.strip():  # Skip empty lines
            current_block.append(line)
            brace_level += line.count("{") - line.count("}")

        # Finalize block when brace level is 0
        if brace_level == 0 and current_block:
            block_content = "".join(current_block).strip()
            if block_content:  # Avoid empty blocks
                blocks.append(block_content)
            current_block = []

    # Separate valid and invalid blocks
    valid_blocks = [block for block in blocks if re.search(r"'([^']+)'", block)]
    invalid_blocks = [block for block in blocks if not re.search(r"'([^']+)'", block)]

    # Sort valid blocks alphabetically
    sorted_valid_blocks = sorted(valid_blocks, key=lambda block: re.search(r"'([^']+)'", block).group(1))

    # Reconstruct the FIREBOT_VARIABLES object with only valid blocks
    sorted_body = "\n".join(sorted_valid_blocks)
    sorted_variables_section = variables_header + sorted_body + variables_footer

    # Reconstruct the full file
    full_sorted_content = pre_variables + sorted_variables_section + post_variables

    # Write the final content to the output file
    with open(output_path, 'w') as file:
        file.write(full_sorted_content)

    # Log excluded invalid blocks for transparency
    if invalid_blocks:
        excluded_blocks_path = 'excluded_invalid_blocks.txt'
        with open(excluded_blocks_path, 'w') as log_file:
            log_file.write("\n\n--- EXCLUDED BLOCK ---\n\n".join(invalid_blocks))
        print(f"Excluded invalid blocks logged to: {excluded_blocks_path}")

    print(f"Variables sorted with invalid blocks excluded. Written to: {output_path}")


if __name__ == "__main__":
    # Input and output file paths
    input_file = input("Enter the path to your TypeScript file: ")
    output_file = input("Enter the path to save the sorted file: ")

    sort_firebot_variables_exclude_invalid(input_file, output_file)

