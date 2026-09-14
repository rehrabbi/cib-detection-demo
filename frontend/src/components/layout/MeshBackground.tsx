import React from 'react';

export default function MeshBackground() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      
      {/* Top Right Green Mesh */}
      <div className="absolute top-0 right-0 mix-blend-normal">
        <svg width="1054" height="468" viewBox="0 0 1054 468" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g filter="url(#filter0_fn_879_386)">
            <path d="M825.38 69.7649C1187.99 -59.4997 1149.88 492.319 1271.49 399.5C1366.63 326.888 1341.42 217.097 1323.35 55.9993C1293.6 -209.351 1384.06 -139.233 674.759 -160.357C-34.5438 -181.482 15.9441 -17.7648 111.756 69.7648C207.569 157.295 462.771 199.03 825.38 69.7649Z" fill="url(#paint0_linear_879_386)"/>
          </g>
          <defs>
            <filter id="filter0_fn_879_386" x="0" y="-219.221" width="1397.49" height="686.305" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feFlood floodOpacity="0" result="BackgroundImageFix"/>
              <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
              <feGaussianBlur stdDeviation="28.5" result="effect1_foregroundBlur_879_386"/>
              <feTurbulence type="fractalNoise" baseFrequency="2 2" stitchTiles="stitch" numOctaves="3" result="noise" seed="2317" />
              <feComponentTransfer in="noise" result="coloredNoise1">
                <feFuncR type="linear" slope="2" intercept="-0.5" />
                <feFuncG type="linear" slope="2" intercept="-0.5" />
                <feFuncB type="linear" slope="2" intercept="-0.5" />
                <feFuncA type="discrete" tableValues="1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 "/>
              </feComponentTransfer>
              <feComposite operator="in" in2="effect1_foregroundBlur_879_386" in="coloredNoise1" result="noise1Clipped" />
              <feComponentTransfer in="noise1Clipped" result="color1">
                <feFuncA type="table" tableValues="0 0.15" />
              </feComponentTransfer>
              <feMerge result="effect2_noise_879_386">
                <feMergeNode in="effect1_foregroundBlur_879_386" />
                <feMergeNode in="color1" />
              </feMerge>
            </filter>
            <linearGradient id="paint0_linear_879_386" x1="777.99" y1="407" x2="126.506" y2="-375.742" gradientUnits="userSpaceOnUse">
              <stop offset="0.169392" stopColor="#CAF976"/>
              <stop offset="1" stopColor="#38AE02"/>
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Bottom Left Blue Mesh */}
      <div className="absolute bottom-0 left-0 mix-blend-normal">
        <svg width="933" height="800" viewBox="0 0 933 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g filter="url(#filter0_fn_879_387)">
            <path d="M175.644 454.617C-203.352 595.031 28.1575 43.0297 -78.3523 57.2712C-196.979 73.133 -237.852 553.031 -237.852 553.031C-237.852 553.031 -407.572 579.771 291.038 704.271C989.648 828.771 903.648 613.857 821.648 513.271C739.648 412.686 554.64 314.203 175.644 454.617Z" fill="url(#paint0_linear_879_387)"/>
          </g>
          <defs>
            <filter id="filter0_fn_879_387" x="-313" y="0" width="1245.8" height="799.016" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feFlood floodOpacity="0" result="BackgroundImageFix"/>
              <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
              <feGaussianBlur stdDeviation="28.5" result="effect1_foregroundBlur_879_387"/>
              <feTurbulence type="fractalNoise" baseFrequency="2 2" stitchTiles="stitch" numOctaves="3" result="noise" seed="2317" />
              <feColorMatrix in="noise" type="luminanceToAlpha" result="alphaNoise" />
              <feComponentTransfer in="alphaNoise" result="coloredNoise1">
                <feFuncA type="discrete" tableValues="1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 "/>
              </feComponentTransfer>
              <feComposite operator="in" in2="effect1_foregroundBlur_879_387" in="coloredNoise1" result="noise1Clipped" />
              <feFlood floodColor="rgba(0, 0, 0, 0.25)" result="color1Flood" />
              <feComposite operator="in" in2="noise1Clipped" in="color1Flood" result="color1" />
              <feMerge result="effect2_noise_879_387">
                <feMergeNode in="effect1_foregroundBlur_879_387" />
                <feMergeNode in="color1" />
              </feMerge>
            </filter>
            <linearGradient id="paint0_linear_879_387" x1="225.648" y1="306.271" x2="225.648" y2="704.271" gradientUnits="userSpaceOnUse">
              <stop offset="0.341346" stopColor="#003FB1"/>
              <stop offset="1" stopColor="#EEEFF0"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}