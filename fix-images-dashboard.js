
const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "app/dashboard/page.tsx");
if (!fs.existsSync(filePath)) {
    console.log("File not found:", filePath);
    process.exit(0);
}
let content = fs.readFileSync(filePath, "utf8");

if (!content.includes("import Image")) {
  // Try to insert after the last import
  const lastImportIndex = content.lastIndexOf("import ");
  const endOfLastImport = content.indexOf("\n", lastImportIndex);
  if (endOfLastImport !== -1) {
    content = content.substring(0, endOfLastImport) + "\nimport Image from \"next/image\";" + content.substring(endOfLastImport);
  } else {
    content = "import Image from \"next/image\";\n" + content;
  }
}

// Regex to match <img ... />
const imgRegex = /<img\s+([^>]+?)\s*\/?>/g;

content = content.replace(imgRegex, (match, props) => {
  let srcMatch = props.match(/src=\{([^}]+)\}/) || props.match(/src="([^"]+)"/);
  let isSvg = false;
  if (srcMatch) {
    let srcVal = srcMatch[1];
    if (srcVal.includes(".svg")) isSvg = true;
  }
  
  let newProps = props;
  
  if (props.includes("w-full") && props.includes("h-full")) {
    newProps = newProps.replace(/w-full\s*/g, "").replace(/h-full\s*/g, "");
    return `<Image fill ${newProps} />`;
  } else {
    let w = 800, h = 800;
    if (isSvg) {
      w = 100; h = 100;
    } else if (props.includes("w-8") || props.includes("w-6") || props.includes("w-5") || props.includes("w-4") || props.includes("w-[24px]") || props.includes("w-[32px]")) {
      w = 100; h = 100;
    } else if (props.includes("w-[65%]")) {
      w = 1200; h = 1200;
    }
    return `<Image width={${w}} height={${h}} ${newProps} />`;
  }
});

fs.writeFileSync(filePath, content, "utf8");
console.log("Dashboard images updated.");

