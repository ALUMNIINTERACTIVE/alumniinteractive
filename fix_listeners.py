import re

with open('app/app.js', 'r') as f:
    content = f.read()

# Pattern to find variable names for DOM elements
# e.g., const btnEditTag = document.getElementById('btn-edit-tag');
dom_vars = re.findall(r'const\s+([a-zA-Z0-9_]+)\s*=\s*document\.getElementById', content)

# For each dom var, we replace `varName.addEventListener(` with `if (varName) varName.addEventListener(`
# Wait, this is hard because we need to close the `if` block at the end of the addEventListener block.
# Since JS event listeners can be multi-line, it's easier to just override EventTarget.prototype.addEventListener? NO.
# Let's just override document.getElementById so it never returns null, but a dummy element!
