
const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "app/public/page.tsx");
let content = fs.readFileSync(filePath, "utf8");

if (!content.includes("import Image")) {
  content = content.replace("import Link from \"next/link\";", "import Link from \"next/link\";\nimport Image from \"next/image\";");
}

// Regex to match <img ... />
const imgRegex = /<img\s+([^>]+?)\s*\/?>/g;

content = content.replace(imgRegex, (match, props) => {
  // If it is an SVG, we can leave it as <img > or change it. 
  // Next.js Image component handles SVGs fine if we give width/height, but standard <img> is also fine for SVGs.
  // The user said "update the code to use the Next.js optimized <Image> component". It usually means replacing all.
  
  // Let us extract src, className, alt
  let srcMatch = props.match(/src=\{([^}]+)\}/) || props.match(/src="([^"]+)"/);
  let isSvg = false;
  if (srcMatch) {
    let srcVal = srcMatch[1];
    if (srcVal.includes(".svg")) isSvg = true;
  }
  
  let newProps = props;
  
  // Replace className="w-full h-full ..." with just className="..." and add fill
  // But wait, some SVGs also use w-full h-full. 
  if (props.includes("w-full") && props.includes("h-full")) {
    // If it has w-full and h-full, we can use fill instead of width/height
    newProps = newProps.replace(/w-full\s*/g, "").replace(/h-full\s*/g, "");
    return `<Image fill ${newProps} />`;
  } else {
    // Determine a fallback width/height. 
    // For small icons (w-6, w-4, w-[24px], w-[32px])
    let w = 500, h = 500;
    if (isSvg) {
      w = 100; h = 100;
    } else if (props.includes("w-[115%]")) {
      w = 800; h = 800;
    } else if (props.includes("w-[32px]") || props.includes("w-[40px]")) {
      w = 100; h = 100;
    }
    return `<Image width={${w}} height={${h}} ${newProps} />`;
  }
});

fs.writeFileSync(filePath, content, "utf8");
console.log("Images updated.");

