
'use client';

export function TechEffects() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10"
    >
      <svg
        width="100%"
        height="100%"
        className="circuit-board absolute inset-0 opacity-20"
        preserveAspectRatio="none"
      >
        <g>
          <path
            className="trace"
            style={{ animationDelay: '-1s' }}
            d="M 10 10 H 250 V 150 H 50 V 350 H 250"
            fill="none"
          />
          <path
            className="trace"
            style={{ animationDelay: '-2s' }}
            d="M 250 10 H 10 V 200 H 250 V 300 H 10"
            fill="none"
          />
          <path
            className="trace"
            style={{ animationDelay: '-3s' }}
            d="M 120 10 V 350"
            fill="none"
          />
          <path
            className="trace"
            style={{ animationDelay: '-4s' }}
            d="M 10 80 H 250"
            fill="none"
          />
          <path
            className="trace"
            style={{ animationDelay: '-5s' }}
            d="M 10 250 H 250"
            fill="none"
          />
        </g>
      </svg>
      <svg
        width="100%"
        height="100%"
        className="neuron-paths absolute inset-0 opacity-30"
        preserveAspectRatio="none"
      >
        <defs>
          <path id="neuron1" d="M 20,20 C 100,20 80,150 240,150" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <path id="neuron2" d="M 240,340 C 150,340 180,200 20,200" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <path id="neuron3" d="M 20,180 Q 240,20 240,340" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        </defs>
        <circle className="pulse" style={{ animationDelay: '0s' }}>
          <animateMotion dur="4s" repeatCount="indefinite" rotate="auto">
            <mpath href="#neuron1" />
          </animateMotion>
        </circle>
        <circle className="pulse" style={{ animationDelay: '-1.3s' }}>
          <animateMotion dur="4s" repeatCount="indefinite" rotate="auto">
            <mpath href="#neuron2" />
          </animateMotion>
        </circle>
        <circle className="pulse" style={{ animationDelay: '-2.6s' }}>
          <animateMotion dur="4s" repeatCount="indefinite" rotate="auto">
            <mpath href="#neuron3" />
          </animateMotion>
        </circle>
      </svg>
    </div>
  );
}

    