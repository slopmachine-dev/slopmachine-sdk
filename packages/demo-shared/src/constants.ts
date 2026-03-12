export const simpleVersionedExampleBucketId = "ERoiCqBgrKqwTjhxcHJw";
export const basicExampleBucketId = "VXPbaUOn62fG74b7iIGt";
export const managedExampleBucketId = "fFzg3gpfI03VdjTekcQd";
export const proceduralExampleBucketId = "0Risb3L5eS76tidF3ug9";
export const videoExampleBucketId = "i7ydY0005DyuXyUgj7tl";

export const basicExamplePrompt =
  "A beautiful scene in {location}, where the weather is {weather}, there are flying pigs in the background somewhere, and there is the text 'Slop Machine was here {date}', all in the style of {style}";

export const simpleVersionedExamplePromptV1 =
  "A hyper-realistic, slightly dystopian product photo of a can of 'Premium Slop' sitting on a stark concrete pedestal. The can label is minimalist neobrutalist design, bold black Helvetica text on raw aluminum that reads 'CONTENT SUBSTITUTE'. The background is a soft, clinical laboratory white with harsh, dramatic shadows. A single, perfect, viscous drip of iridescent, glowing pink goo is running down the side of the can. 8k resolution, ray-traced reflections, high fashion editorial lighting, sterile aesthetic.";
export const simpleVersionedExamplePromptV2 =
  "A 4:5 vertical, center-framed macro shot, hyper-realistic, slightly dystopian product photo of a weathered metal industrial pail sitting on a brutalist concrete plinth. The label on the pail is minimalist neobrutalist design, precisely rendered, bold black Helvetica text on rusted metal that reads 'CONTENT SUBSTITUTE'. The background is a soft, seamless matte white laboratory cove with subtle recessed panel lines with harsh, dramatic shadows. A single, perfect, viscous drip of iridescent, glowing opaque pink gloop is running down the side of the can. 8k resolution, ray-traced reflections, cinematic color grading with desaturated tones and a cold cyan tint in the shadows, high fashion editorial lighting with a shallow depth of field (f/2.8) to softly blur the clinical background, sterile aesthetic .";

export const managedWithControlsExamplePrompt =
  "A 4:5 vertical, center-framed macro shot, hyper-realistic, slightly dystopian product photo of a weathered metal industrial pail sitting on a brutalist concrete plinth. The label on the pail is minimalist neobrutalist design, precisely rendered, bold {textcolor} Helvetica text on rusted metal that reads 'CONTENT SUBSTITUTE'. The background is a soft, seamless matte {bgcolor} laboratory cove with subtle recessed panel lines with harsh, dramatic shadows. A single, perfect, viscous drip of iridescent, glowing opaque {slopcolor} gloop is running down the side of the can. 8k resolution, ray-traced reflections, cinematic color grading with desaturated tones and a cold cyan tint in the shadows, high fashion editorial lighting with a shallow depth of field (f/2.8) to softly blur the clinical background, sterile aesthetic .";

export const proceduralExamplePrompt =
  "An infographic featuring flying pigs and demonstrating how Slop Machine helps creatives define brand-safe generative assets such as images, that developers can take and personalize to end users at runtime without compromising on the original vision. Note also the current location which is {location}, and the weather which is {weather}. Try to incorporate these into the image elements in a creative way. The brand color is rose and the overall style should be neo-brutalism.";

export const videoExamplePrompt =
  "A flying pig, __doing something cool__. Neu-brutalist aesthetic with high-contrast cinematic lighting, emphasizing matte rose-400 surfaces and raw concrete textures, white wings. Suitable for a looped web page background {theme} theme. A low-angle tracking shot reveals bold sans-serif text integrated into the concrete architecture: Slop Machine.";

export const versionOptions = [
  { value: "Auto", label: "Auto (Latest)" },
  { value: "2", label: "v2" },
  { value: "1", label: "v1" },
];

export const resultOptionsV1 = [
  { value: "Auto", label: "Auto (Most Recently Approved)" },
  { value: "QJuYL5DFlxI5f0bXk0pH", label: "Result 2 (QJuYL5DFlxI5f0bXk0pH)" },
  { value: "Sg9i0Z0ODOiINua0UAUy", label: "Result 1 (Sg9i0Z0ODOiINua0UAUy)" },
];

export const resultOptionsV2 = [
  { value: "Auto", label: "Auto (Most Recently Approved)" },
  { value: "8WlPKNpXhhoyTkjlZwNM", label: "Result 5 (8WlPKNpXhhoyTkjlZwNM)" },
  { value: "NqFfXu9irWXpUqYq9e8o", label: "Result 4 (NqFfXu9irWXpUqYq9e8o)" },
  { value: "VPstcpsjYbmarU7ahtji", label: "Result 3 (VPstcpsjYbmarU7ahtji)" },
  { value: "dBV5WZGFjcI6mPuADSc0", label: "Result 2 (dBV5WZGFjcI6mPuADSc0)" },
  { value: "s7v0HgPw0qXXMUp5Obtn", label: "Result 1 (s7v0HgPw0qXXMUp5Obtn)" },
];

export const DEFAULT_STATE = {
  location: "Auto",
  weather: "Auto",
  style: "Oil Painting",
  result: "Auto",
  version: "Auto",
  bgColor: "white",
  textColor: "black",
  slopColor: "pink",
};

export const DROPDOWN_OPTIONS = {
  locations: [
    { value: "London", label: "London" },
    { value: "Tokyo", label: "Tokyo" },
    { value: "New York", label: "New York" },
    { value: "Mars", label: "Mars" },
  ],
  weather: [
    { value: "Rainy", label: "Rainy" },
    { value: "Sunny", label: "Sunny" },
    { value: "Snowing", label: "Snowing" },
    { value: "Apocalyptic", label: "Apocalyptic" },
  ],
  styles: [
    { value: "Oil Painting", label: "Oil Painting" },
    { value: "Cyberpunk", label: "Cyberpunk" },
    { value: "Minimalist Vector", label: "Minimalist Vector" },
    { value: "Claymation", label: "Claymation" },
  ],
  textColors: [
    { value: "black", label: "Black" },
    { value: "gray", label: "Gray" },
    { value: "rose", label: "Rose" },
    { value: "blue", label: "Blue" },
  ],
  bgColors: [
    { value: "white", label: "White" },
    { value: "black", label: "Black" },
    { value: "gray", label: "Gray" },
    { value: "red", label: "Red" },
    { value: "blue", label: "Blue" },
    { value: "yellow", label: "Yellow" },
  ],
  slopColors: [
    { value: "pink", label: "Pink" },
    { value: "green", label: "Green" },
    { value: "blue", label: "Blue" },
    { value: "yellow", label: "Yellow" },
    { value: "purple", label: "Purple" },
  ],
};
