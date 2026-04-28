"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/Button";

function ArrowRight() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

const gapBetweenImgRow = "mt-3";

export default function GetStartPage() {
  const router = useRouter();

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Left panel — form */}
      <div className="w-162 shrink-0 flex flex-col justify-center px-12 py-10 overflow-y-auto bg-white">
        <div className="flex flex-col items-center justify-center">
          <div className={`${gapBetweenImgRow} w-48 h-12 mb-6 overflow-hidden`}>
            <img src="/Logo/Logo.svg" alt="Logo" />
          </div>
          <div className="text-left ">
            <h1 className="text-[#272E35] text-2xl font-inter font-bold">
              Welcome to nooi
            </h1>
            <p className="text-[#9EA8B3] text-base font-inter text-[14px]">
              Let's set up your profile
            </p>
          </div>
          <Button
            type="button"
            variant="cta-teal"
            onClick={() => router.push("/authpage/signin")}
            className="mt-8 mr-7 w-42 h-12"
          >
            <span className="font-medium text-[20px] flex items-center pl-2.5">
              Get Started
            </span>
            <div className="w-10 h-10 bg-white text-[#1B5E5E] rounded-lg flex items-center justify-center mt-1 ml-3">
              <ArrowRight />
            </div>
          </Button>
        </div>
      </div>

      {/* Right panel — masonry image gallery */}
      <div className="flex-1 overflow-hidden bg-[#ffffff] -mt-8">
        <div className="columns-3 gap-3 p-1.5 [column-fill:balance]">
          {/* Column 1 items */}
          <div
            className={`${gapBetweenImgRow} mb-1.5 w-full aspect-4/3 rounded-sm`}
          >
            <img
              src="/Images/img1.png"
              alt="Sofa"
              className="w-full h-full object-cover object-bottom"
            />
          </div>
          <div className={`${gapBetweenImgRow} mb-1.5 w-full aspect-3/2`}>
            <img
              src="/Images/img2.png"
              alt="Sofa"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <div className={`${gapBetweenImgRow} mb-1.5 w-full aspect-3/2`}>
            <img
              src="/Images/img3.png"
              alt="Sofa"
              className="w-full h-full object-cover object-center rounded-xl"
            />
          </div>
          <div className={`${gapBetweenImgRow} mb-1.5 w-full aspect-3/4`}>
            <img
              src="/Images/img1.png"
              alt="Sofa"
              className="w-full h-full object-cover object-center rounded-xl"
            />
          </div>
          {/* <div className="break-inside-avoid mb-1.5 w-full aspect-4/3 bg-[#1f0b0b] rounded-sm" /> */}
          {/* Column 2 items */}
          <div className={`${gapBetweenImgRow} mb-1.5 w-full aspect-video`}>
            <img
              src="/Images/img5.png"
              alt="Sofa"
              className="w-full h-full object-cover object-bottom rounded-xl"
            />
          </div>
          <div className={`${gapBetweenImgRow} mb-1.5 w-full aspect-2/3`}>
            <img
              src="/Images/img6.png"
              alt="Sofa"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <div className={`${gapBetweenImgRow} mb-1.5 w-full aspect-4/3`}>
            <img
              src="/Images/img7.png"
              alt="Sofa"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <div className={`${gapBetweenImgRow} mb-1.5 w-full aspect-square`}>
            <img
              src="/Images/img8.png"
              alt="Sofa"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          {/* Column 3 items */}
          <div className={`${gapBetweenImgRow} mb-1.5 w-full aspect-3/2`}>
            <img
              src="/Images/img9.png"
              alt="Sofa"
              className="w-full h-full object-cover object-bottom rounded-xl "
            />
          </div>
          <div className={`${gapBetweenImgRow} mb-1.5 w-full aspect-2/3`}>
            <img
              src="/Images/img10.png"
              alt="Sofa"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <div className={`${gapBetweenImgRow} mb-1.5 w-full aspect-4/3`}>
            <img
              src="/Images/img11.png"
              alt="Sofa"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <div className={`${gapBetweenImgRow} mb-1.5 w-full aspect-3/2`}>
            <img
              src="/Images/img12.png"
              alt="Sofa"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
