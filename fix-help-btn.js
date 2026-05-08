
const fs = require("fs");
const filePath = "app/public/page.tsx";
let content = fs.readFileSync(filePath, "utf8");

content = content.replace(
  `className="hidden lg:flex w-[46px] h-[46px] items-center justify-center hover:bg-black/5 rounded-full transition-colors shrink-0"`,
  `className="relative hidden lg:flex w-[46px] h-[46px] items-center justify-center hover:bg-black/5 rounded-full transition-colors shrink-0"`
);

fs.writeFileSync(filePath, content, "utf8");
console.log("Help button fixed");

