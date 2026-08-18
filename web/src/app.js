import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import polygonClipping from "polygon-clipping";
import * as THREE from "three";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { ThreeMFLoader } from "../assets/vendor/three/examples/jsm/loaders/3MFLoader.js?v=fflate-path-20260604";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";

const parameterSchema = [
  ["head_width", "Frame width", "Overall front width including hinge pads", 118, 172, 1, "mm"],
  ["bridge_width", "Nose bridge", "Nose clearance", 12, 30, 0.5, "mm"],
  ["lens_width", "Lens width", "Single lens opening", 40, 64, 0.5, "mm"],
  ["lens_height", "Lens height", "Lens opening height", 28, 50, 0.5, "mm"],
  ["rim_thickness", "Rim thickness", "Material around lens", 2.5, 9, 0.1, "mm"],
  ["frame_depth", "Front depth", "Extrusion depth", 3, 12, 0.1, "mm"],
  ["temple_length", "Temple length", "Arm length", 70, 180, 1, "mm"],
  ["temple_drop", "Temple drop", "Behind-ear hook", 0, 42, 1, "mm"],
  ["temple_spread", "Temple spread", "Fixed hinge axis", 0, 0, 0.5, "°"],
  ["nose_pad_width", "Nose pad width", "Support surface", 3, 14, 0.5, "mm"],
  ["nose_pad_drop", "Nose pad position", "Support offset", 0, 18, 0.5, "mm"],
  ["hinge_width", "Hinge width", "Side block", 3, 16, 0.5, "mm"],
  ["corner_radius", "Corner radius", "Lens corner radius", 2, 14, 0.5, "mm"],
  ["bevel", "Bevel", "Soft printable edge", 0, 2.4, 0.1, "mm"]
];

const visibleParameterKeys = new Set(["bridge_width", "head_width", "temple_length"]);

const translations = {
  en: {
    brandKicker: "",
    navLabel: "Navigation",
    accountKicker: "Local account",
    accountHeading: "Frame Lab offline access",
    accountEmailPlaceholder: "you@example.com",
    signInAccount: "Login",
    signOutAccount: "Sign out",
    closeAccount: "Close",
    accountFreeNote: "No active plan: create an account with a reusable activation code or activate another code locally.",
    accountBasicNote: "Personal: Creator access for personal use.",
    accountProNote: "Commercial: Creator access for commercial use.",
    accountPlusNote: "Ultra Support: lifetime commercial Creator access.",
    accountDeveloperNote: "Developer: full access, collection management and deletion.",
    lockedModel: "Plan required to download",
    upgrade: "Plan",
    tabHome: "Start",
    tabConfigurator: "Editor",
    tabGallery: "Collections",
    tabStudio: "Developer",
    heroKicker: "",
    heroTitle: "Your next frame is 3D printed.",
    heroText: "Choose a collection, combine a front with temples, and prepare a clean production kit for additive manufacturing.",
    heroBrowse: "View collections",
    heroEditor: "Open Creator",
    builderKicker: "",
    builderHeading: "Components",
    frameSize: "Frame size",
    frontComponent: "Front",
    leftTempleComponent: "Left temple",
    rightTempleComponent: "Right temple",
    componentSize: "Size",
    componentCompatible: "Compatible connector",
    componentWarning: "Check hinge compatibility",
    paramsKicker: "Parameters",
    fitHeading: "Fit",
    reset: "Reset",
    productionKicker: "",
    productionHeading: "Export",
    generate3mf: "3MF",
    generateStl: "STL",
    downloadAssembly: "Download kit",
    saveModel: "Save model",
    exportScad: ".scad",
    exportJson: "JSON",
    copyScad: "Copy",
    readyLog: "Ready.",
    libraryKicker: "Collections",
    galleryHeading: "Choose a frame base",
    sunHeading: "Sunglasses",
    sunMeta: "",
    opticalHeading: "Optical",
    opticalMeta: "",
    studioKicker: "Developer",
    studioHeading: "Collection manager",
    frameEditorKicker: "Frame editor",
    frameEditorHeading: "Frame workspace",
    backToDeveloper: "Back to Developer",
    collectionTitlePlaceholder: "Collection title",
    collectionDescriptionPlaceholder: "Short description",
    sunCategory: "Sunglasses",
    opticalCategory: "Optical",
    chooseImage: "Photo",
    addScad: ".scad file",
    frontModelFile: "Front variants",
    templeModelFile: "Temple models",
    leftTempleModelFile: "Left temples",
    rightTempleModelFile: "Right temples",
    lensModelFile: "Lens models",
    addCollection: "Add to gallery",
    componentImportKicker: "Components",
    componentImportHeading: "Add option to selected collection",
    componentNamePlaceholder: "Component name",
    connectorPlaceholder: "Connector",
    templeComponent: "Temple",
    leftSide: "Left",
    rightSide: "Right",
    universalSide: "Universal",
    lensComponent: "Lens",
    noLensComponent: "No lens model selected",
    chooseCadFile: "Choose 3MF / STEP",
    addComponentFile: "Add component",
    noComponents: "No STEP/3MF files added yet.",
    storedLocally: "Saved",
    activeModel: "Active model",
    scadFile: ".scad file",
    open: "Configure",
    variants: "Options",
    export: "Export",
    delete: "Delete",
    moveLeft: "Left",
    moveRight: "Right",
    newCollection: "New collection",
    editingCollection: "Editing",
    heroTitlePlaceholder: "Hero title",
    heroTextPlaceholder: "Hero text",
    heroImageFile: "Hero image",
    parametersDetected: "params",
    param_head_width_label: "Frame width",
    param_head_width_hint: "Overall front width including hinge pads",
    param_bridge_width_label: "Nose bridge",
    param_bridge_width_hint: "Clearance at the nose",
    param_temple_length_label: "Temple length",
    param_temple_length_hint: "Arm length",
    loader3mfTitle: "Generating 3MF",
    loader3mfText: "Packing the current geometry for production...",
    loaderStlTitle: "Generating STL",
    loaderStlText: "Writing the current geometry...",
    savedModel: "Saved model to gallery",
    resetLog: "Parameters restored to the production baseline.",
    exportedScad: "Exported OpenSCAD file.",
    exportedJson: "Exported parameter JSON.",
    copiedScad: "Copied OpenSCAD source to clipboard."
  }
};

const defaultParams = {
  head_width: 150,
  bridge_width: 18,
  lens_width: 52,
  lens_height: 37,
  rim_thickness: 5.2,
  frame_depth: 5.8,
  temple_length: 100,
  temple_drop: 30,
  temple_spread: 0,
  nose_pad_width: 8,
  nose_pad_drop: 7,
  hinge_width: 8.5,
  corner_radius: 8,
  bevel: 0.55
};

const designParameterGroups = {
  front: [
    ["head_width", "Frame width"],
    ["bridge_width", "Bridge opening"],
    ["lens_height", "Lens height"],
    ["rim_thickness", "Rim thickness"]
  ],
  temples: []
};
const defaultDesignStyle = {
  lensShape: "soft-square",
  templeDetailMode: "none",
  templePattern: "ribs",
  templeText: "",
  leftTempleText: "",
  rightTempleText: "",
  browBar: false,
  frameColor: "#ff741f",
  templeColor: "#ff741f",
  lensColor: "#202529",
  frameOpacity: 1,
  templeOpacity: 1,
  lensOpacity: 0.62,
  detailColor: "#e59a62"
};
const templePatternIds = ["ribs", "micro-ribs", "slots", "dots", "diamond", "wave"];
const defaultDesignSketchPoints = [
  [-0.42, 0.5],
  [0.36, 0.5],
  [0.5, 0.34],
  [0.47, -0.3],
  [0.34, -0.5],
  [-0.38, -0.5],
  [-0.5, -0.3],
  [-0.5, 0.3]
];
const defaultDesignSketchRadii = [5, 2.5, 5, 4, 6, 6, 4, 5];
const defaultDesignPublicParameters = ["head_width", "bridge_width", "temple_length"];
const designPublicParameterKeys = [
  "head_width",
  "bridge_width",
  "lens_height",
  "rim_thickness",
  "temple_length",
  "temple_drop"
];
const defaultDesignConstruction = {
  hingeStandard: "FL-H1",
  lensThickness: 1,
  lensSeatWidth: 1.2,
  lensSeatDepth: 0.75,
  lensClearance: 0.12,
  lensChannelOffset: 0,
  hingeMountHeight: 10,
  hingeMountOffset: 0,
  bridgeThickness: 6,
  bridgeBlendRadius: 3.45,
  bridgeTopJoinOffset: 3,
  bridgeBottomJoinOffset: -3,
  noseWingHeight: 2.4,
  noseWingAngle: 8,
  noseWingRound: 0.35,
  noseWingTopRound: 0.35,
  noseWingBaseRound: 0.35,
  noseWingTopOffset: -1.4,
  noseWingBottomOffset: -10.4,
  noseWingTopShift: 0,
  noseWingBottomShift: 1.25,
  noseWingTopOuterOffset: -1.4,
  noseWingTopInnerOffset: -1.4,
  noseWingBottomInnerOffset: -10.4,
  noseWingBottomOuterOffset: -10.4,
  topVisorEnabled: false,
  topVisorDepth: 3,
  topVisorBandHeight: 4.8,
  topVisorRadius: 0.55,
  topVisorStartX: -60,
  topVisorEndX: 60,
  templeStraight: 70,
  templeHook: 30,
  templeHookAngle: 45,
  templeBarHeight: 5.4,
  templeDepth: 3.6,
  templeCornerRadius: 1.4,
  templeChamferEnabled: false,
  templeChamferAmount: 0.35,
  templeTextureDepth: 0.45,
  templePatternStart: 14,
  templePatternEnd: 76,
  templePatternSpacing: 9,
  templePatternSize: 4.2,
  templeTextSize: 4,
  templeTextPosition: 36,
  templeTextYOffset: 0,
  templeTextDepth: 0.45
};
// The visible front remains planar: a side landing carries the mechanical hinge behind it.
const designHingePadSize = 6;
// Keep the supplied hinge landing bonded to enough of the printed front body.
const designHingePadOverlap = 1;
const designHingeRearOverlap = 0.2;
const designNoseWingRearOverlapMin = 0.18;
const designNoseWingRearOverlapMax = 0.85;
const designMinimumLensOpeningWidth = 20;
// FL-H1 temple bounds after vertical-bore rotation; the authored arm grows from its rear face.
const designTempleBarCenterY = 2.8;
const designTempleHingeRearZ = -7.5;
const designTempleArmJoinOverlap = 0.9;
const designTempleProfileStartZ = designTempleHingeRearZ + designTempleArmJoinOverlap;
const designTempleTextSafeStart = 0;
const designTempleTextEndPadding = 8;
const designHingeAssetManifest = {
  frontLeft: "./assets/hinges/front-hinge-left.3mf",
  frontRight: "./assets/hinges/front-hinge-right.3mf",
  templeLeft: "./assets/hinges/temple-hinge-left.3mf",
  templeRight: "./assets/hinges/temple-hinge-right.3mf"
};

function designNoseWingRearOverlap(depth) {
  const safeDepth = Math.max(0, Number.isFinite(depth) ? depth : 0);
  if (safeDepth <= 0) return 0;
  return Math.min(
    designNoseWingRearOverlapMax,
    safeDepth * 0.72,
    Math.max(designNoseWingRearOverlapMin, safeDepth * 0.32)
  );
}

function designHingeWidthAllowance() {
  return Math.max(0, (designHingePadSize - designHingePadOverlap) * 2);
}

function designMinimumRimSpan(values) {
  const bridgeWidth = parseDesignNumber(values?.bridge_width, defaultParams.bridge_width);
  const rimThickness = parseDesignNumber(values?.rim_thickness, defaultParams.rim_thickness);
  return bridgeWidth + rimThickness * 4 + designMinimumLensOpeningWidth * 2;
}

function designRimSpanForParams(values) {
  const totalWidth = parseDesignNumber(values?.head_width, defaultParams.head_width);
  return Math.max(designMinimumRimSpan(values), totalWidth - designHingeWidthAllowance());
}

function designRimSpan(p) {
  const supplied = Number(p?.rim_span);
  return Number.isFinite(supplied) ? supplied : designRimSpanForParams(p);
}

const defaultModelId = "frame001-sun-01";
const ownerDeveloperEmail = "nyderek@framelab.dev";
const adminEmails = new Set([ownerDeveloperEmail, "s.nyderek@proton.me"]);
const defaultAccentColor = "#c96b34";
const defaultHeroImage = "./assets/frame-lab-hero.png";
const defaultPrintGuideImage = "./assets/print-guide-honeycomb.svg";
const defaultColorSlots = ["#ff741f", "#2d2b27", "#f1eee9", "#0f1010", "#8f8b82"];
const planProductIds = ["personal_lifetime", "commercial_lifetime", "personal_year", "commercial_year", "supporter", "ultra_support"];
const accessPlanIds = ["free", "basic", "pro", "studio"];
const defaultContentSettings = {
  plans: [
    {
      plan: "personal_lifetime",
      access: "basic",
      name: "Lifetime Personal",
      price: "$99",
      period: "one-time",
      exports: "Lifetime Creator access",
      description: "Personal use license for your own frames and fit experiments.",
      benefits: ["Lifetime access to the Creator", "Personal use for your own printed frames"]
    },
    {
      plan: "commercial_lifetime",
      access: "pro",
      name: "Lifetime Commercial",
      price: "$199",
      period: "one-time",
      exports: "Lifetime commercial Creator access",
      description: "Commercial use license for paid work, products and client projects.",
      benefits: ["Lifetime access to the Creator", "Commercial use for exported frame designs"]
    },
    {
      plan: "personal_year",
      access: "basic",
      name: "Personal Year",
      price: "$25",
      period: "/ year",
      exports: "One-year Creator access",
      description: "Personal Creator access for one year.",
      benefits: ["Creator access for personal projects", "Export production files for your own prints", "One-year access activated by code"]
    },
    {
      plan: "commercial_year",
      access: "pro",
      name: "Commercial Year",
      price: "$49",
      period: "/ year",
      exports: "One-year commercial Creator access",
      description: "Commercial Creator access for one year.",
      benefits: ["Creator access for client and product work", "Commercial use for exported frame designs", "One-year access activated by code"]
    },
    {
      plan: "supporter",
      access: "free",
      name: "Supporter",
      price: "$10",
      period: "one-time support",
      exports: "No Creator access included",
      description: "Support Frame Lab development without plan benefits.",
      benefits: []
    },
    {
      plan: "ultra_support",
      access: "studio",
      name: "Ultra Support",
      price: "$999",
      period: "lifetime",
      exports: "Lifetime commercial Creator access",
      description: "Top supporter tier with lifetime commercial use.",
      benefits: ["Lifetime commercial Creator access", "Unlimited creator exports", "Top supporter tier for Frame Lab"]
    }
  ],
  sizes: {
    heading: "Sizes",
    intro: "Pick the size from your face width, nose bridge and preferred temple length. The recommendation is a starting point for 3D printed test fits.",
    rows: [
      { size: "S", label: "Narrow", headMin: 125, headMax: 137, frameWidth: "126-134 mm", lensWidth: "49-52 mm", bridgeMin: 14, bridgeMax: 17, templeMin: 130, templeMax: 140, note: "Slim faces and smaller nose bridges." },
      { size: "M", label: "Regular", headMin: 138, headMax: 149, frameWidth: "135-144 mm", lensWidth: "52-55 mm", bridgeMin: 17, bridgeMax: 20, templeMin: 140, templeMax: 150, note: "Most adult fits and balanced sunglasses proportions." },
      { size: "L", label: "Wide", headMin: 150, headMax: 162, frameWidth: "145-155 mm", lensWidth: "55-59 mm", bridgeMin: 20, bridgeMax: 23, templeMin: 150, templeMax: 160, note: "Wider heads, stronger wrap and longer temples." }
    ]
  },
  printGuide: {
    heading: "How to print it",
    intro: "Use any stiff filament for the frame. For lenses, cut the exported lens template from 1 mm clear acrylic, or print lens inserts with honeycomb infill and 0 top and bottom shell layers.",
    image: defaultPrintGuideImage
  },
  roadmap: {
    heading: "Roadmap",
    items: [
      { title: "Crowdfunding release", status: "Next", description: "Backer codes, stable exports and first production-ready sunglasses." },
      { title: "Lens library", status: "Planned", description: "Printable lens placeholders and templates for cutting transparent sheet lenses." },
      { title: "Fit calibration", status: "Planned", description: "Guided measurements with size recommendations stored in each account." }
    ]
  },
  license: {
    heading: "License",
    body: "Backer access codes unlock downloads according to the selected tier. Personal use is included by default; commercial use can be reserved for a higher tier if needed."
  },
  faq: {
    heading: "FAQ",
    items: [
      { question: "Can I configure before I unlock a plan?", answer: "Yes. All frames can be configured first; downloads unlock after activating a code." },
      { question: "What files do I receive?", answer: "The export is a clean 3MF production file for the selected front, temples, lenses and colors." },
      { question: "How should I make the lenses?", answer: "Use the lens template to cut 1 mm clear acrylic, or print honeycomb lens inserts for a printed texture effect." }
    ]
  }
};
const defaultBrandSettings = {
  accentColor: defaultAccentColor,
  backgroundColor: "#0c0d0d",
  surfaceColor: "#141616",
  textColor: "#f1eee9",
  mutedColor: "#9a9690",
  borderColor: "#292c2c",
  sceneColor: "#070909",
  heroTitle: "Your next frame is 3D printed.",
  heroText: "Choose a collection, combine a front with temples, and prepare a clean production kit for additive manufacturing.",
  heroImage: "",
  heroModelId: "",
  publishingEnabled: false,
  content: structuredClone(defaultContentSettings)
};
const accountStorageKey = "framelab.account.v1";
const sessionStorageKey = "framelab.sessionToken.v1";
const accountProfilesStorageKey = "framelab.accounts.v1";
const hiddenComponentsStorageKey = "framelab.hiddenComponents.v1";
const brandSettingsStorageKey = "framelab.brandSettings.v1";
const colorSlotsStorageKey = "framelab.colorSlots.v1";
const planRank = { free: 0, basic: 1, pro: 2, studio: 3 };
const licenseCodeTypes = {
  personal_year: { label: "Personal Year", plan: "basic", duration: "year" },
  commercial_year: { label: "Commercial Year", plan: "pro", duration: "year" },
  personal_lifetime: { label: "Lifetime Personal", plan: "basic", duration: "lifetime" },
  commercial_lifetime: { label: "Lifetime Commercial", plan: "pro", duration: "lifetime" },
  supporter: { label: "Supporter", plan: "free", duration: "supporter" },
  ultra_support: { label: "Ultra Support / lifetime commercial", plan: "studio", duration: "lifetime" },
  basic_month: { label: "Legacy Basic / 1 month", plan: "basic", duration: "month" },
  pro_month: { label: "Legacy Pro / 1 month", plan: "pro", duration: "month" },
  plus_month: { label: "Legacy Plus / 1 month", plan: "studio", duration: "month" },
  basic_year: { label: "Legacy Basic / 1 year", plan: "basic", duration: "year" },
  pro_year: { label: "Legacy Pro / 1 year", plan: "pro", duration: "year" },
  plus_year: { label: "Legacy Plus / 1 year", plan: "studio", duration: "year" },
  basic_lifetime: { label: "Legacy Basic / lifetime", plan: "basic", duration: "lifetime" },
  pro_lifetime: { label: "Legacy Pro / lifetime", plan: "pro", duration: "lifetime" },
  plus_lifetime: { label: "Legacy Plus / lifetime", plan: "studio", duration: "lifetime" }
};
const seedCollections = [
  {
    id: defaultModelId,
    name: "Frame 001",
    category: "sun",
    access: "basic",
    description: "First production-ready modular frame kit.",
    params: { head_width: 150, bridge_width: 18, lens_width: 52, lens_height: 37, temple_length: 100 },
    order: 0
  }
];

const baseComponentLibrary = {
  fronts: [],
  temples: [],
  lenses: []
};

const legacyModelIds = new Set([
  "openframe-rx-01",
  "sun-arc-02",
  "sun-block-03",
  "sun-coast-04",
  "sun-field-05",
  "optical-line-01",
  "optical-soft-02",
  "optical-narrow-03",
  "optical-wide-04",
  "optical-studio-05"
]);

const componentLibrary = {
  fronts: [],
  temples: [],
  lenses: []
};

const sampleScad = `// Frame Lab OpenSCAD eyewear template
// Edit these values in the browser or directly in OpenSCAD.

head_width = 150;      // [118:1:172]
bridge_width = 18;    // [12:0.5:30]
lens_width = 52;      // [40:0.5:64]
lens_height = 37;     // [28:0.5:50]
rim_thickness = 5.2;  // [2.5:0.1:9]
frame_depth = 5.8;    // [3:0.1:12]
temple_length = 100;  // [70:1:180]
temple_drop = 30;     // [0:1:42]
temple_spread = 0;    // Fixed straight from the hinge axis.
nose_pad_width = 8;   // [3:0.5:14]
nose_pad_drop = 7;    // [0:0.5:18]
hinge_width = 8.5;    // [3:0.5:16]
corner_radius = 8;    // [2:0.5:14]
bevel = 0.55;         // [0:0.1:2.4]

module rounded_square_2d(size=[10,10], r=2) {
  offset(r=r) square([size[0]-2*r, size[1]-2*r], center=true);
}

module lens_rim(cx=0) {
  translate([cx, 0, 0])
  linear_extrude(height=frame_depth, center=true, convexity=8)
  difference() {
    rounded_square_2d([lens_width + rim_thickness*2.15, lens_height + rim_thickness*2.05], corner_radius + rim_thickness*0.9);
    rounded_square_2d([lens_width, lens_height], corner_radius);
  }
}

module soft_bar(size=[10,4,4], r=1) {
  linear_extrude(height=size[2], center=true, convexity=4)
  rounded_square_2d([size[0], size[1]], r);
}

module brow_bar() {
  total_width = bridge_width + lens_width*2 + rim_thickness*5.3;
  translate([0, lens_height/2 + rim_thickness*0.72, 0.05])
  soft_bar([total_width, rim_thickness*1.05, frame_depth*0.95], rim_thickness*0.45);
}

module bridge() {
  translate([0, lens_height*0.08, 0])
  soft_bar([bridge_width + rim_thickness*2.35, rim_thickness*1.15, frame_depth], rim_thickness*0.35);
}

module nose_pads() {
  for (side=[-1,1])
  translate([side*(bridge_width/2 + nose_pad_width/2), -lens_height/4 - nose_pad_drop/4, -frame_depth/2])
  rotate([0, 0, side*10])
  soft_bar([nose_pad_width, rim_thickness*1.45, frame_depth*0.72], rim_thickness*0.35);
}

module temple(side=1) {
  lens_center = (bridge_width + lens_width) / 2;
  hinge_x = side * (lens_center + lens_width/2 + rim_thickness + hinge_width/2);
  spread = side * temple_spread;
  translate([hinge_x, lens_height*0.28, -frame_depth*0.08])
  rotate([0, spread, 0])
  union() {
    soft_bar([hinge_width, rim_thickness*1.7, frame_depth*1.2], rim_thickness*0.32);
    for (slot=[-1,1])
    translate([side*hinge_width*0.52, slot*rim_thickness*0.42, -frame_depth*0.78])
    rotate([0, 90, 0])
    cylinder(h=hinge_width*0.95, r=rim_thickness*0.34, center=true, $fn=20);
    translate([side*hinge_width*0.34, 0.2, -temple_length/2 - frame_depth*0.5])
    soft_bar([rim_thickness*1.25, rim_thickness*1.05, temple_length], rim_thickness*0.32);
    translate([side*hinge_width*0.34, -temple_drop*0.28, -temple_length - frame_depth*0.5 - temple_drop*0.28])
    rotate([-28, 0, 0])
    soft_bar([rim_thickness*1.3, rim_thickness*1.05, temple_drop], rim_thickness*0.32);
  }
}

module glasses() {
  lens_center = (bridge_width + lens_width) / 2;
  union() {
    lens_rim(-lens_center);
    lens_rim(lens_center);
    brow_bar();
    bridge();
    nose_pads();
    temple(-1);
    temple(1);
  }
}

glasses();
`;

const modelStorageKey = "framelab.openscadModels.v1";
const componentDbName = "framelab-component-files";
const componentStoreName = "components";
const saveDesignCollectionDefaultLabel = "Save collection";
const collectionEditorAddLabel = "Add to gallery";
const collectionEditorSaveLabel = "Save changes";
const designNoseWingRoundMax = 12;
const seedComponentAssets = [
  {
    id: "frame001-front",
    name: "Frame 001 Front",
    kind: "front",
    size: "M",
    connector: "FL-H8",
    format: "3mf",
    fileName: "frame-001-front.3mf",
    assetUrl: "./assets/test-models/frame-001-front.3mf",
    source: "asset"
  },
  {
    id: "frame001-temple-left",
    name: "Frame 001 Temple Left",
    kind: "temple",
    size: "M",
    connector: "FL-H8",
    format: "3mf",
    fileName: "frame-001-temple-left.3mf",
    assetUrl: "./assets/test-models/frame-001-temple-left.3mf",
    templeSide: "left",
    source: "asset"
  },
  {
    id: "frame001-temple-right",
    name: "Frame 001 Temple Right",
    kind: "temple",
    size: "M",
    connector: "FL-H8",
    format: "3mf",
    fileName: "frame-001-temple-right.3mf",
    assetUrl: "./assets/test-models/frame-001-temple-right.3mf",
    templeSide: "right",
    source: "asset"
  },
  {
    id: "frame001-no-logo-temple-left",
    name: "Frame 001 No Logo Temple Left",
    kind: "temple",
    size: "M",
    connector: "FL-H8",
    format: "3mf",
    fileName: "frame-001-no-logo-temple-left.3mf",
    assetUrl: "./assets/test-models/frame-001-no-logo-temple-left.3mf",
    templeSide: "left",
    source: "asset"
  },
  {
    id: "frame001-no-logo-temple-right",
    name: "Frame 001 No Logo Temple Right",
    kind: "temple",
    size: "M",
    connector: "FL-H8",
    format: "3mf",
    fileName: "frame-001-no-logo-temple-right.3mf",
    assetUrl: "./assets/test-models/frame-001-no-logo-temple-right.3mf",
    templeSide: "right",
    source: "asset"
  }
];

const state = {
  params: structuredClone(defaultParams),
  scadSource: sampleScad,
  modelName: "Frame 001",
  meshObject: null,
  previewMode: "parametric",
  frameColor: "#2d2b27",
  models: [],
  uploadedComponents: [],
  hiddenComponentIds: new Set(),
  activeModelId: defaultModelId,
  lang: "en",
  account: {
    email: "",
    firstName: "",
    lastName: "",
    plan: "free",
	    role: "visitor",
	    subscriptionMode: "free",
	    subscriptionStatus: "none",
	    planEndsAt: null,
	    measurements: { headWidth: null, bridgeWidth: null, templeLength: null }
	  },
  authMode: "login",
  lensMode: "none",
  downloads: [],
  downloadQuota: null,
  licenseCodes: [],
  staticLicenseCodes: [],
  editingModelId: null,
  cropImage: null,
  croppedCollectionImage: "",
  collectionPhotoTargetId: "",
  viewerRotation: { x: -0.48, y: 0.62, z: 0.03 },
  viewerPan: { x: 0, y: 0 },
  componentColors: {
    front: "",
    leftTemple: "",
    rightTemple: "",
    lens: ""
  },
  componentColorSources: {
    front: "",
    leftTemple: "",
    rightTemple: "",
    lens: ""
  },
  colorEditor: {
    type: "",
    key: "",
    index: -1,
    source: "",
    draft: ""
  },
  openComponentOptions: {
    front: true
  },
  colorSlots: [...defaultColorSlots],
  brandSettings: structuredClone(defaultBrandSettings),
  activeParametricDesign: null,
  designDraft: createDefaultDesignDraft(),
  designSubmissions: [],
  system: {
    storage: { persistent: false, source: "unknown", message: "" }
  },
  selectedPlanId: "",
  recentSavedCollectionId: "",
  assemblySize: "M",
  assembly: {
    front: { modelId: "frame001-front", size: "M" },
    leftTemple: { modelId: "frame001-temple-left", size: "M" },
    rightTemple: { modelId: "frame001-temple-right", size: "M" },
    lens: { modelId: "", size: "M" }
  }
};

const els = {
  topbar: document.querySelector(".topbar"),
  homePage: document.querySelector("#homePage"),
  workspace: document.querySelector("#workspace"),
  designLab: document.querySelector("#designLab"),
  studioPanel: document.querySelector("#developerPanel"),
  collectionEditorPanel: document.querySelector("#collectionEditorPanel"),
  galleryPanel: document.querySelector("#galleryPanel"),
  canvas: document.querySelector("#scene"),
  designCanvas: document.querySelector("#designScene"),
  designSketchCanvas: document.querySelector("#designSketchCanvas"),
  controls: document.querySelector("#controls"),
  builderControls: document.querySelector("#builderControls"),
  componentName: document.querySelector("#componentName"),
  componentKind: document.querySelector("#componentKind"),
  componentTempleSide: document.querySelector("#componentTempleSide"),
  componentSize: document.querySelector("#componentSize"),
  componentConnector: document.querySelector("#componentConnector"),
  componentFileInput: document.querySelector("#componentFileInput"),
  addComponentFile: document.querySelector("#addComponentFile"),
  componentFileList: document.querySelector("#componentFileList"),
  frameEditorPhoto: document.querySelector("#frameEditorPhoto"),
  frameEditorPhotoCaption: document.querySelector("#frameEditorPhotoCaption"),
  frameEditorComponentGallery: document.querySelector("#frameEditorComponentGallery"),
  accountPanel: document.querySelector("#accountPanel"),
  plansPanel: document.querySelector("#plansPanel"),
  licensePanel: document.querySelector("#licensePanel"),
  plansContext: document.querySelector("#plansContext"),
  accountButton: document.querySelector("#accountButton"),
  plansButton: document.querySelector("#plansButton"),
  authTitle: document.querySelector("#authTitle"),
  authModeButtons: document.querySelectorAll("[data-auth-mode]"),
  nameFields: document.querySelector("#nameFields"),
  accountFirstName: document.querySelector("#accountFirstName"),
  accountLastName: document.querySelector("#accountLastName"),
  accountEmail: document.querySelector("#accountEmail"),
  accountPassword: document.querySelector("#accountPassword"),
  accountPasswordConfirm: document.querySelector("#accountPasswordConfirm"),
  confirmPasswordField: document.querySelector("#confirmPasswordField"),
  registrationCodeField: document.querySelector("#registrationCodeField"),
  accountRegistrationCode: document.querySelector("#accountRegistrationCode"),
  passwordToggleButtons: document.querySelectorAll("[data-password-toggle]"),
  accountNote: document.querySelector("#accountNote"),
  authForm: document.querySelector(".auth-form"),
  accountProfile: document.querySelector("#accountProfile"),
  profileEmail: document.querySelector("#profileEmail"),
  profileName: document.querySelector("#profileName"),
  profileRole: document.querySelector("#profileRole"),
	  profilePlan: document.querySelector("#profilePlan"),
	  profileStatus: document.querySelector("#profileStatus"),
	  profileExports: document.querySelector("#profileExports"),
	  accountHeadWidth: document.querySelector("#accountHeadWidth"),
	  accountBridgeWidth: document.querySelector("#accountBridgeWidth"),
	  accountTempleLength: document.querySelector("#accountTempleLength"),
	  saveFitProfile: document.querySelector("#saveFitProfile"),
	  fitRecommendation: document.querySelector("#fitRecommendation"),
  downloadFolder: document.querySelector("#downloadFolder"),
  licenseCodeInput: document.querySelector("#licenseCodeInput"),
  redeemLicenseCode: document.querySelector("#redeemLicenseCode"),
  licenseCodeNote: document.querySelector("#licenseCodeNote"),
  planLicenseCodeInput: document.querySelector("#planLicenseCodeInput"),
  redeemPlanLicenseCode: document.querySelector("#redeemPlanLicenseCode"),
  planLicenseCodeNote: document.querySelector("#planLicenseCodeNote"),
  publicPlanLicenseCodeInput: document.querySelector("#publicPlanLicenseCodeInput"),
  redeemPublicPlanLicenseCode: document.querySelector("#redeemPublicPlanLicenseCode"),
  publicPlanLicenseCodeNote: document.querySelector("#publicPlanLicenseCodeNote"),
  profileOpenPlans: document.querySelector("#profileOpenPlans"),
  profileSignOut: document.querySelector("#profileSignOut"),
  cancelSubscription: document.querySelector("#cancelSubscription"),
	  closeProfilePanel: document.querySelector("#closeProfilePanel"),
  pricingGrid: document.querySelector("#pricingGrid"),
  publicPricingGrid: document.querySelector("#publicPricingGrid"),
  plansCarouselPrevious: document.querySelector("#plansCarouselPrevious"),
  plansCarouselNext: document.querySelector("#plansCarouselNext"),
	  cropPanel: document.querySelector("#cropPanel"),
  cropCanvas: document.querySelector("#cropCanvas"),
  cropZoom: document.querySelector("#cropZoom"),
  cropX: document.querySelector("#cropX"),
  cropY: document.querySelector("#cropY"),
  cropNote: document.querySelector("#cropNote"),
  applyCrop: document.querySelector("#applyCrop"),
  cancelCrop: document.querySelector("#cancelCrop"),
  developerCollectionPhotoInput: document.querySelector("#developerCollectionPhotoInput"),
  signInAccount: document.querySelector("#signInAccount"),
  signOutAccount: document.querySelector("#signOutAccount"),
  closeAccountPanel: document.querySelector("#closeAccountPanel"),
  closePlansPanel: document.querySelector("#closePlansPanel"),
  planButtons: document.querySelectorAll("button[data-plan]"),
  galleryGrid: document.querySelector("#galleryGrid"),
  sunGalleryGrid: document.querySelector("#sunGalleryGrid"),
  opticalGalleryGrid: document.querySelector("#opticalGalleryGrid"),
  brandHome: document.querySelector("#brandHome"),
  heroTitle: document.querySelector("#heroTitle"),
  heroText: document.querySelector("#heroText"),
  heroImage: document.querySelector("#heroImage"),
  galleryScadInput: document.querySelector("#galleryScadInput"),
  collectionTitle: document.querySelector("#collectionTitle"),
  collectionCategory: document.querySelector("#collectionCategory"),
  collectionAccess: document.querySelector("#collectionAccess"),
  collectionDescription: document.querySelector("#collectionDescription"),
  collectionImageInput: document.querySelector("#collectionImageInput"),
  collectionFrontInput: document.querySelector("#collectionFrontInput"),
  collectionLeftTempleInput: document.querySelector("#collectionLeftTempleInput"),
  collectionRightTempleInput: document.querySelector("#collectionRightTempleInput"),
  collectionLensInput: document.querySelector("#collectionLensInput"),
  addCollection: document.querySelector("#addCollection"),
	  openHome: document.querySelector("#openHome"),
	  openConfigurator: document.querySelector("#openConfigurator"),
	  openGallery: document.querySelector("#openGallery"),
	  openPrintGuide: document.querySelector("#openPrintGuide"),
	  openRoadmap: document.querySelector("#openRoadmap"),
	  openLicenseInfo: document.querySelector("#openLicenseInfo"),
	  openFaq: document.querySelector("#openFaq"),
	  openStudio: document.querySelector("#openStudio"),
  openLicenses: document.querySelector("#openLicenses"),
  startDesignLab: document.querySelector("#startDesignLab"),
  exitDesignLab: document.querySelector("#exitDesignLab"),
  designName: document.querySelector("#designName"),
  designDescription: document.querySelector("#designDescription"),
  designFrontControls: document.querySelector("#designFrontControls"),
  designTempleControls: document.querySelector("#designTempleControls"),
  designTabs: document.querySelectorAll("[data-design-tab]"),
  designOperationsPanel: document.querySelector("#designOperationsPanel"),
  designFeaturesPanel: document.querySelector("#designFeaturesPanel"),
  designRightTemplePanel: document.querySelector("#designRightTemplePanel"),
  designAssemblyPanel: document.querySelector("#designAssemblyPanel"),
  designAppearancePanel: document.querySelector("#designAppearancePanel"),
  designCodePanel: document.querySelector("#designCodePanel"),
  designStageTools: document.querySelector("#designStageTools"),
  designFrontPointTools: document.querySelector("#designFrontPointTools"),
  designTemplePointTools: document.querySelector("#designTemplePointTools"),
  designScadCode: document.querySelector("#designScadCode"),
  regenerateDesignCode: document.querySelector("#regenerateDesignCode"),
  applyDesignCode: document.querySelector("#applyDesignCode"),
  designLensShape: document.querySelector("#designLensShape"),
  designTempleDetailMode: document.querySelector("#designTempleDetailMode"),
  designTemplePattern: document.querySelector("#designTemplePattern"),
  designTempleTextureControls: document.querySelector("#designTempleTextureControls"),
  designTempleTextControls: document.querySelector("#designTempleTextControls"),
  designRightTempleTextControls: document.querySelector("#designRightTempleTextControls"),
  designTempleText: document.querySelector("#designTempleText"),
  designRightTempleText: document.querySelector("#designRightTempleText"),
  designBrowBar: document.querySelector("#designBrowBar"),
  designFrameColor: document.querySelector("#designFrameColor"),
  designTempleColor: document.querySelector("#designTempleColor"),
  designLensColor: document.querySelector("#designLensColor"),
  designDetailColor: document.querySelector("#designDetailColor"),
  designFrameOpacity: document.querySelector("#designFrameOpacity"),
  designTempleOpacity: document.querySelector("#designTempleOpacity"),
  designLensOpacity: document.querySelector("#designLensOpacity"),
  designPublicParameters: document.querySelector("#designPublicParameters"),
  designProductionChecks: document.querySelector("#designProductionChecks"),
  addSketchPoint: document.querySelector("#addSketchPoint"),
  removeSketchPoint: document.querySelector("#removeSketchPoint"),
  addTemplePoint: document.querySelector("#addTemplePoint"),
  removeTemplePoint: document.querySelector("#removeTemplePoint"),
  designSelectedCornerLabel: document.querySelector("#designSelectedCornerLabel"),
  designSelectedCornerRadius: document.querySelector("#designSelectedCornerRadius"),
  designSharpCorner: document.querySelector("#designSharpCorner"),
  designTempleSharpCorner: document.querySelector("#designTempleSharpCorner"),
  designTempleSelectedCornerLabel: document.querySelector("#designTempleSelectedCornerLabel"),
  designTempleSelectedCornerRadius: document.querySelector("#designTempleSelectedCornerRadius"),
  designTempleChamferEnabled: document.querySelector("#designTempleChamferEnabled"),
  designTempleChamferAmount: document.querySelector("#designTempleChamferAmount"),
  designViewSketch: document.querySelector("#designViewSketch"),
  designView3d: document.querySelector("#designView3d"),
  designViewHint: document.querySelector("#designViewHint"),
  designUndo: document.querySelector("#designUndo"),
  designRedo: document.querySelector("#designRedo"),
  designMeasureToggle: document.querySelector("#designMeasureToggle"),
  designMeasureClear: document.querySelector("#designMeasureClear"),
  designMeasureReadout: document.querySelector("#designMeasureReadout"),
  designWarnings: document.querySelector("#designWarnings"),
  designExtrudeDepth: document.querySelector("#designExtrudeDepth"),
  designFilletRadius: document.querySelector("#designFilletRadius"),
  designChamferAmount: document.querySelector("#designChamferAmount"),
  designLensRecessEnabled: document.querySelector("#designLensRecessEnabled"),
  designLensRecessDepth: document.querySelector("#designLensRecessDepth"),
  designLensSlotWidth: document.querySelector("#designLensSlotWidth"),
  designLensCaptureDepth: document.querySelector("#designLensCaptureDepth"),
  designLensClearance: document.querySelector("#designLensClearance"),
  designLensChannelOffset: document.querySelector("#designLensChannelOffset"),
  designLensSlotMetric: document.querySelector("#designLensSlotMetric"),
  designLensCaptureMetric: document.querySelector("#designLensCaptureMetric"),
  designLensChannelSummary: document.querySelector("#designLensChannelSummary"),
  designHingeMountHeight: document.querySelector("#designHingeMountHeight"),
  designHingeMountOffset: document.querySelector("#designHingeMountOffset"),
  designBridgeThickness: document.querySelector("#designBridgeThickness"),
  designBridgeBlendRadius: document.querySelector("#designBridgeBlendRadius"),
  designNoseWingHeight: document.querySelector("#designNoseWingHeight"),
  designNoseWingAngle: document.querySelector("#designNoseWingAngle"),
  designNoseWingRound: document.querySelector("#designNoseWingRound"),
  designNoseWingBaseRound: document.querySelector("#designNoseWingBaseRound"),
  designTopVisorEnabled: document.querySelector("#designTopVisorEnabled"),
  designTopVisorDepth: document.querySelector("#designTopVisorDepth"),
  designTopVisorBandHeight: document.querySelector("#designTopVisorBandHeight"),
  designTopVisorRadius: document.querySelector("#designTopVisorRadius"),
  designTempleStraight: document.querySelector("#designTempleStraight"),
  designTempleHook: document.querySelector("#designTempleHook"),
  designTempleHookAngle: document.querySelector("#designTempleHookAngle"),
  designTempleBarHeight: document.querySelector("#designTempleBarHeight"),
  designTempleDepth: document.querySelector("#designTempleDepth"),
  designTempleCornerRadius: document.querySelector("#designTempleCornerRadius"),
  designTempleTextureDepth: document.querySelector("#designTempleTextureDepth"),
  designTemplePatternStart: document.querySelector("#designTemplePatternStart"),
  designTemplePatternEnd: document.querySelector("#designTemplePatternEnd"),
  designTemplePatternSpacing: document.querySelector("#designTemplePatternSpacing"),
  designTemplePatternSize: document.querySelector("#designTemplePatternSize"),
  designTempleTextSize: document.querySelector("#designTempleTextSize"),
  designTempleTextPosition: document.querySelector("#designTempleTextPosition"),
  designTempleTextDepth: document.querySelector("#designTempleTextDepth"),
  designDimensions: document.querySelector("#designDimensions"),
  designStatus: document.querySelector("#designStatus"),
  designSubmissionStatus: document.querySelector("#designSubmissionStatus"),
  designPublishingPanel: document.querySelector("#designPublishingPanel"),
  designPublishingComingSoon: document.querySelector("#designPublishingComingSoon"),
  resetDesign: document.querySelector("#resetDesign"),
  exportDesign3mf: document.querySelector("#exportDesign3mf"),
  downloadDesignScad: document.querySelector("#downloadDesignScad"),
  saveDesignCollection: document.querySelector("#saveDesignCollection"),
  submitDesign: document.querySelector("#submitDesign"),
  designSubmissionList: document.querySelector("#designSubmissionList"),
  collectionEditorHeading: document.querySelector("#collectionEditorHeading"),
  studioModeLabel: document.querySelector("#studioModeLabel"),
  clearStudioEdit: document.querySelector("#clearStudioEdit"),
  backToDeveloper: document.querySelector("#backToDeveloper"),
  newDeveloperCollection: document.querySelector("#newDeveloperCollection"),
  developerCollectionList: document.querySelector("#developerCollectionList"),
  brandAccentColor: document.querySelector("#brandAccentColor"),
  brandAccentText: document.querySelector("#brandAccentText"),
  brandBackgroundColor: document.querySelector("#brandBackgroundColor"),
  brandSurfaceColor: document.querySelector("#brandSurfaceColor"),
  brandTextColor: document.querySelector("#brandTextColor"),
  brandMutedColor: document.querySelector("#brandMutedColor"),
  brandBorderColor: document.querySelector("#brandBorderColor"),
  brandSceneColor: document.querySelector("#brandSceneColor"),
  saveBrandSettings: document.querySelector("#saveBrandSettings"),
  resetBrandSettings: document.querySelector("#resetBrandSettings"),
  heroTitleInput: document.querySelector("#heroTitleInput"),
  heroTextInput: document.querySelector("#heroTextInput"),
  heroEditorTarget: document.querySelector("#heroEditorTarget"),
  heroImageInput: document.querySelector("#heroImageInput"),
  resetHeroImage: document.querySelector("#resetHeroImage"),
  brandSettingsNote: document.querySelector("#brandSettingsNote"),
  storageStatusNote: document.querySelector("#storageStatusNote"),
  refreshStorageDebug: document.querySelector("#refreshStorageDebug"),
  storageDebugPanel: document.querySelector("#storageDebugPanel"),
  publishingEnabledToggle: document.querySelector("#publishingEnabledToggle"),
  planContentEditor: document.querySelector("#planContentEditor"),
  pageContentEditor: document.querySelector("#pageContentEditor"),
  printGuideHeading: document.querySelector("#printGuideHeading"),
  printGuideIntro: document.querySelector("#printGuideIntro"),
  printGuideFigure: document.querySelector("#printGuideFigure"),
  printGuideImage: document.querySelector("#printGuideImage"),
  openPrintGuideImage: document.querySelector("#openPrintGuideImage"),
  imageLightbox: document.querySelector("#imageLightbox"),
  lightboxImage: document.querySelector("#lightboxImage"),
  closeImageLightbox: document.querySelector("#closeImageLightbox"),
  roadmapHeading: document.querySelector("#roadmapHeading"),
	  roadmapItems: document.querySelector("#roadmapItems"),
	  licenseInfoHeading: document.querySelector("#licenseInfoHeading"),
	  licenseInfoBody: document.querySelector("#licenseInfoBody"),
	  faqHeading: document.querySelector("#faqHeading"),
	  faqItems: document.querySelector("#faqItems"),
	  printGuideButton: document.querySelector("#printGuideButton"),
  licenseCodeType: document.querySelector("#licenseCodeType"),
  licenseCodeQuantity: document.querySelector("#licenseCodeQuantity"),
  generateLicenseCodes: document.querySelector("#generateLicenseCodes"),
  licenseAdminNote: document.querySelector("#licenseAdminNote"),
  licenseCodeList: document.querySelector("#licenseCodeList"),
  staticLicenseCodeList: document.querySelector("#staticLicenseCodeList"),
  heroBrowse: document.querySelector("#heroBrowse"),
  heroEditor: document.querySelector("#heroEditor"),
  saveCurrentModel: document.querySelector("#saveCurrentModel"),
  exportScad: document.querySelector("#exportScad"),
  exportJson: document.querySelector("#exportJson"),
  copyScad: document.querySelector("#copyScad"),
  generate3mf: document.querySelector("#generate3mf"),
  generateStl: document.querySelector("#generateStl"),
  downloadAssembly: document.querySelector("#downloadAssembly"),
  resetParams: document.querySelector("#resetParams"),
  saveEndpoint: document.querySelector("#saveEndpoint"),
  modelName: document.querySelector("#modelName"),
  metricWidth: document.querySelector("#metricWidth"),
  metricBridge: document.querySelector("#metricBridge"),
  metricTemple: document.querySelector("#metricTemple"),
  meshStatus: document.querySelector("#meshStatus"),
  polyCount: document.querySelector("#polyCount"),
  importLog: document.querySelector("#importLog"),
  scadPreview: document.querySelector("#scadPreview"),
  loaderOverlay: document.querySelector("#loaderOverlay"),
  loaderTitle: document.querySelector("#loaderTitle"),
  loaderText: document.querySelector("#loaderText"),
  colorPickerPanel: document.querySelector("#colorPickerPanel"),
  colorPickerTitle: document.querySelector("#colorPickerTitle"),
  colorPickerInput: document.querySelector("#colorPickerInput"),
  colorPickerValue: document.querySelector("#colorPickerValue"),
  closeColorPicker: document.querySelector("#closeColorPicker"),
  cancelColorPicker: document.querySelector("#cancelColorPicker"),
  applyColorPicker: document.querySelector("#applyColorPicker"),
  viewFront: document.querySelector("#viewFront"),
  viewIso: document.querySelector("#viewIso"),
  viewSide: document.querySelector("#viewSide")
};

let scene;
let camera;
let renderer;
let modelGroup;
let modelBasePosition = new THREE.Vector3(0, 8, 0);
let dragState = null;
let triangleCount = 0;
let persistTimer = null;
let backendPersistTimer = null;
let saveCollectionFeedbackTimer = null;
let collectionEditorFeedbackTimer = null;
let cameraZoomScale = 1;
let viewerFitRadius = 100;
const cameraTarget = new THREE.Vector3(0, 0, 0);
let cameraBaseDistance = 250;
let cameraBaseHeight = 0;
let componentPreviewRenderers = [];
let sharedComponentPreviewRenderer = null;
let navigationScrollFrame = null;
let uiBound = false;
let navigationBound = false;
let designScene;
let designCamera;
let designRenderer;
let designModelGroup;
let designDragState = null;
let designSketchDragIndex = -1;
let designSketchSelectedIndex = 0;
let designTempleSketchDragIndex = -1;
let designTempleSketchSelectedIndex = 0;
let designTempleTextDragState = null;
let designMeasureMode = false;
let designMeasureStep = "";
let designMeasurePoints = [];
let designMeasureMarkerGroup = null;
let designControlHistoryTarget = null;
let designHingeLibrary = {};
let designTextFont = null;
let designTextFontLoading = false;
const designTempleTextWidthCache = new Map();
let designTempleTextMeasureCanvas = null;
let designCameraDistance = 260;
let designZoomScale = 1;
const designCameraTarget = new THREE.Vector3();
const designViewerRotation = { x: -0.54, y: 0.56, z: 0.02 };
const designBridgeHandleSelectionOffset = 1000;
const designNoseWingHandleSelectionOffset = 1100;
const designTopVisorHandleSelectionOffset = 1200;
const designHistoryLimit = 60;
const designHistory = {
  past: [],
  future: [],
  restoring: false
};
const bootState = window.frameLabBoot || {
  ready: false,
  editorRequested: false,
  designLabRequested: false,
  resetDesignDraftRequested: false,
  pendingCollectionId: ""
};

init().catch(handleBootError);

async function init() {
  loadSettings();
  const publicBootSettings = publicBootBrandSettings();
  if (publicBootSettings) state.brandSettings = normalizeBrandSettings(publicBootSettings);
  applyBrandSettings();
  bindUi();
  updateAccountUi();
  renderPublicContent();
  await hydrateSystemStatus();
  await hydrateBrandSettings();
  await hydrateSessionFromBackend();
  updateAccountUi();
  renderPublicContent();
  setupNavigation();
  state.models = await loadStoredModels();
  selectModel(state.models[0]?.id || defaultModelId, { rebuildControls: false, renderScene: false, logSelection: false });
  renderGallery();
  state.uploadedComponents = [...await loadSeedComponentAssets(), ...await loadComponentRecords()]
    .filter((component) => !state.hiddenComponentIds.has(component.id));
  if (!state.uploadedComponents.some((component) => component.kind === "front") || !state.uploadedComponents.some((component) => component.kind === "temple")) {
    state.hiddenComponentIds = new Set();
    persistHiddenComponents();
    state.uploadedComponents = [...await loadSeedComponentAssets(), ...await loadComponentRecords()];
  }
  await runOptionalBootStep("uploaded component previews", () => hydrateModelComponentMeshes(currentModelRecord()));
  rebuildComponentLibrary();
  repairAssemblyForActiveModel();
  applyAssemblyToParams();
  buildBuilderControls();
  buildControls();
  buildDesignControls();
  await runOptionalBootStep("configurator 3D scene", () => setupScene());
  await runOptionalBootStep("Creator 3D scene", () => setupDesignScene());
  await runOptionalBootStep("Creator hinge assets", () => loadDesignHingeAssets());
  await runOptionalBootStep("Creator drawing canvas", () => setupDesignSketch());
  bindUi();
  syncComponentSideInput();
  applyTranslations();
  updateAccountUi();
  updateGeneratedSource();
  if (renderer && scene && camera && modelGroup) render();
  if (designRenderer && designScene && designCamera && designModelGroup) renderDesignPreview();
  renderGallery();
  renderPublicContent();
  if (bootState.designLabRequested && bootState.resetDesignDraftRequested) {
    resetDesignDraft();
  }
  bootState.ready = true;
  if (bootState.pendingCollectionId) {
    const pendingModel = state.models.find((model) => model.id === bootState.pendingCollectionId);
    bootState.pendingCollectionId = "";
    if (pendingModel) {
      await openCollectionForConfiguration(pendingModel);
    }
    showLoader(false);
  } else if (bootState.editorRequested) {
    openHeroEditorTarget();
    showLoader(false);
  } else if (bootState.designLabRequested) {
    showLoader(false);
  }
  animate();
}

function renderPublicContent() {
  renderPlanCards();
  renderMarketingContent();
  renderFitRecommendation();
}

async function runOptionalBootStep(label, task) {
  try {
    return await task();
  } catch (error) {
    console.warn(`Could not initialize ${label}.`, error);
    document.documentElement.dataset.appWarning = label;
    return null;
  }
}

function handleBootError(error) {
  console.error("Frame Lab could not finish startup.", error);
  document.documentElement.dataset.appError = error?.message || "startup";
  showLoader(false);
  renderPublicContent();
  renderGallery();
  try {
    bindUi();
    updateAccountUi();
    setupNavigation();
  } catch (uiError) {
    console.error("Frame Lab public UI fallback failed.", uiError);
  }
}

function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(sceneBackgroundColor());

  camera = new THREE.PerspectiveCamera(40, 1, 0.1, 4000);
  camera.position.set(0, 70, 250);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ canvas: els.canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene.add(new THREE.HemisphereLight("#fff8ef", "#0b1112", 2.15));

  const key = new THREE.DirectionalLight("#ffffff", 2.8);
  key.position.set(120, 160, 120);
  scene.add(key);

  const warm = new THREE.DirectionalLight("#ff9c4a", 0.75);
  warm.position.set(-120, 50, -80);
  scene.add(warm);

  modelGroup = new THREE.Group();
  modelGroup.position.y = 8;
  modelGroup.rotation.order = "YXZ";
  scene.add(modelGroup);

  window.addEventListener("resize", resize);
  resize();
}

function createDefaultDesignDraft() {
  const params = {
    ...structuredClone(defaultParams),
    head_width: 148,
    bridge_width: 18,
    lens_width: 59,
    lens_height: 38,
    rim_thickness: 3,
    frame_depth: 3,
    temple_length: defaultDesignConstruction.templeStraight + defaultDesignConstruction.templeHook
  };
  return {
    name: "My custom frame",
    description: "",
    params,
    style: structuredClone(defaultDesignStyle),
    sketch: { points: structuredClone(defaultDesignSketchPoints), cornerRadii: structuredClone(defaultDesignSketchRadii), symmetric: true },
    templeSketch: designTempleProfileFromConstruction(defaultDesignConstruction),
    features: createDefaultDesignFeatures(params),
    construction: normalizeDesignConstruction(),
    publicParameters: [...defaultDesignPublicParameters],
    sliderRanges: normalizeDesignSliderRanges(),
    collectionId: "",
    step: "front",
    view: "sketch",
    code: "",
    manualCode: false
  };
}

function normalizeDesignStyle(style = {}) {
  const leftTempleText = String(style.leftTempleText ?? style.templeText ?? "").trim().slice(0, 24);
  const rightTempleText = String(style.rightTempleText ?? style.templeText ?? "").trim().slice(0, 24);
  const frameColor = sanitizeHexColor(style.frameColor ?? style.frontColor, defaultDesignStyle.frameColor);
  const legacyPattern = style.templePattern;
  const templePattern = templePatternIds.includes(legacyPattern)
    ? legacyPattern
    : legacyPattern === "perforated" ? "diamond" : defaultDesignStyle.templePattern;
  const inferredMode = leftTempleText || rightTempleText
    ? "text"
    : legacyPattern && legacyPattern !== "none" ? "texture" : "none";
  return {
    lensShape: ["soft-square", "round", "sharp"].includes(style.lensShape) ? style.lensShape : defaultDesignStyle.lensShape,
    templeDetailMode: ["none", "text", "texture"].includes(style.templeDetailMode) ? style.templeDetailMode : inferredMode,
    templePattern,
    templeText: leftTempleText,
    leftTempleText,
    rightTempleText,
    browBar: false,
    frameColor,
    templeColor: sanitizeHexColor(style.templeColor, frameColor),
    lensColor: sanitizeHexColor(style.lensColor, defaultDesignStyle.lensColor),
    frameOpacity: normalizeDesignOpacity(style.frameOpacity ?? style.frontOpacity, defaultDesignStyle.frameOpacity),
    templeOpacity: normalizeDesignOpacity(style.templeOpacity, defaultDesignStyle.templeOpacity),
    lensOpacity: normalizeDesignOpacity(style.lensOpacity, defaultDesignStyle.lensOpacity),
    detailColor: sanitizeHexColor(style.detailColor, defaultDesignStyle.detailColor)
  };
}

function normalizeDesignOpacity(value, fallback = 1) {
  const parsed = parseDesignNumber(value, fallback);
  const unitValue = parsed > 1 ? parsed / 100 : parsed;
  return THREE.MathUtils.clamp(unitValue, 0.15, 1);
}

function designOpacityPercent(value, fallback = 1) {
  return Math.round(normalizeDesignOpacity(value, fallback) * 100);
}

function createDefaultDesignFeatures(params = defaultParams) {
  const bevelSeed = parseDesignNumber(params.bevel, defaultParams.bevel);
  const edgeRadius = THREE.MathUtils.clamp(bevelSeed * 0.18 || 0.28, 0.18, 0.45);
  return {
    extrude: { enabled: true, depth: parseDesignNumber(params.frame_depth, defaultParams.frame_depth) },
    fillet: { enabled: true, radius: edgeRadius },
    chamfer: { enabled: false, amount: 0 },
    lensRecess: { enabled: true, depth: defaultDesignConstruction.lensSeatDepth }
  };
}

function parseDesignNumber(value, fallback = 0) {
  if (typeof value === "string") {
    const normalized = Number(value.replace(",", "."));
    return Number.isFinite(normalized) ? normalized : fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseDesignBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
    return fallback;
  }
  return Boolean(value);
}

function normalizeDesignSketch(sketch = {}) {
  const supplied = Array.isArray(sketch.points) ? sketch.points : defaultDesignSketchPoints;
  const points = supplied.slice(0, 20).map((point) => {
    const x = THREE.MathUtils.clamp(parseDesignNumber(Array.isArray(point) ? point[0] : point?.x), -0.7, 0.7);
    const y = THREE.MathUtils.clamp(parseDesignNumber(Array.isArray(point) ? point[1] : point?.y), -0.7, 0.7);
    return [x, y];
  });
  const suppliedRadii = Array.isArray(sketch.cornerRadii) ? sketch.cornerRadii : null;
  const fallbackRadii = points.length === defaultDesignSketchPoints.length
    ? defaultDesignSketchRadii
    : Array.from({ length: points.length }, () => 0);
  const cornerRadii = points.map((_, index) => THREE.MathUtils.clamp(
    parseDesignNumber(suppliedRadii?.[index] ?? fallbackRadii[index] ?? 0),
    0,
    30
  ));
  return {
    symmetric: sketch.symmetric !== false,
    points: points.length >= 4 ? points : structuredClone(defaultDesignSketchPoints),
    cornerRadii: points.length >= 4 ? cornerRadii : structuredClone(defaultDesignSketchRadii)
  };
}

function designTempleProfileFromConstruction(construction = defaultDesignConstruction) {
  const numberOrDefault = (value, fallback) => parseDesignNumber(value, fallback);
  const height = numberOrDefault(construction.templeBarHeight, defaultDesignConstruction.templeBarHeight);
  const straight = numberOrDefault(construction.templeStraight, defaultDesignConstruction.templeStraight);
  const hook = numberOrDefault(construction.templeHook, defaultDesignConstruction.templeHook);
  const angle = THREE.MathUtils.degToRad(numberOrDefault(construction.templeHookAngle, defaultDesignConstruction.templeHookAngle));
  const tipX = straight + hook * Math.cos(angle);
  const tipY = -hook * Math.sin(angle);
  return {
    points: [
      [0, height / 2],
      [Math.max(2, straight - 3), height / 2],
      [straight, height / 2 - 0.35],
      [tipX, tipY + height / 2],
      [tipX, tipY - height / 2],
      [straight, -height / 2],
      [0, -height / 2]
    ],
    cornerRadii: [0.5, 1.3, 2, Math.min(2.2, height / 2), Math.min(2.2, height / 2), 1.6, 0.5]
  };
}

function normalizeDesignTempleSketch(sketch = {}, construction = defaultDesignConstruction) {
  const fallback = designTempleProfileFromConstruction(construction);
  const supplied = Array.isArray(sketch.points) ? sketch.points : fallback.points;
  const points = supplied.slice(0, 24).map((point) => [
    THREE.MathUtils.clamp(parseDesignNumber(Array.isArray(point) ? point[0] : point?.x), 0, 150),
    THREE.MathUtils.clamp(parseDesignNumber(Array.isArray(point) ? point[1] : point?.y), -80, 20)
  ]);
  const suppliedRadii = Array.isArray(sketch.cornerRadii) ? sketch.cornerRadii : fallback.cornerRadii;
  const cornerRadii = points.map((_, index) => THREE.MathUtils.clamp(parseDesignNumber(suppliedRadii[index]), 0, 12));
  return points.length >= 4 ? { points, cornerRadii } : fallback;
}

function designTempleSketchMatchesConstruction(sketch = {}, construction = defaultDesignConstruction) {
  const normalized = normalizeDesignTempleSketch(sketch, construction);
  const generated = normalizeDesignTempleSketch(designTempleProfileFromConstruction(construction), construction);
  if (normalized.points.length !== generated.points.length) return false;
  const closeEnough = (left, right, tolerance = 0.05) => Math.abs(Number(left) - Number(right)) <= tolerance;
  return generated.points.every((point, index) => {
    const source = normalized.points[index] || [];
    return closeEnough(source[0], point[0])
      && closeEnough(source[1], point[1])
      && closeEnough(normalized.cornerRadii[index] || 0, generated.cornerRadii[index] || 0);
  });
}

function normalizeDesignFeatures(features = {}, params = defaultParams) {
  const defaults = createDefaultDesignFeatures(params);
  const clamp = (value, min, max, fallback) => {
    const number = parseDesignNumber(value, fallback);
    return THREE.MathUtils.clamp(Number.isFinite(number) ? number : fallback, min, max);
  };
  const filletRadius = clamp(features.fillet?.radius, 0, 2.4, defaults.fillet.radius);
  const chamferAmount = clamp(features.chamfer?.amount, 0, 2.4, defaults.chamfer.amount);
  const hasExplicitFilletEnabled = Object.prototype.hasOwnProperty.call(features.fillet || {}, "enabled");
  const hasExplicitChamferEnabled = Object.prototype.hasOwnProperty.call(features.chamfer || {}, "enabled");
  return {
    extrude: {
      enabled: true,
      depth: clamp(features.extrude?.depth, 3, 12, defaults.extrude.depth)
    },
    fillet: {
      enabled: hasExplicitFilletEnabled ? Boolean(features.fillet.enabled) : filletRadius > 0.001,
      radius: filletRadius
    },
    chamfer: {
      enabled: hasExplicitChamferEnabled ? Boolean(features.chamfer.enabled) : chamferAmount > 0.001,
      amount: chamferAmount
    },
    lensRecess: {
      enabled: features.lensRecess?.enabled !== false,
      depth: clamp(features.lensRecess?.depth, 0.1, 3, defaults.lensRecess.depth)
    }
  };
}

function normalizeDesignConstruction(construction = {}) {
  const bounded = (key, min, max, fallback = defaultDesignConstruction[key]) => {
    const next = parseDesignNumber(construction[key], fallback);
    return THREE.MathUtils.clamp(Number.isFinite(next) ? next : fallback, min, max);
  };
  const bridgeThickness = bounded("bridgeThickness", 3, 12);
  const templeStraight = bounded("templeStraight", 35, 120);
  const templePatternSpacing = bounded("templePatternSpacing", 4, 28);
  const templePatternStart = bounded("templePatternStart", 0, 110);
  const templePatternEnd = THREE.MathUtils.clamp(
    bounded("templePatternEnd", 8, 120),
    templePatternStart + 2,
    120
  );
  const noseWingTopOffset = bounded("noseWingTopOffset", -34, 8);
  const noseWingBottomOffset = bounded("noseWingBottomOffset", -34, 8);
  const legacyNoseWingRound = bounded("noseWingRound", 0, designNoseWingRoundMax);
  const noseWingTopRound = bounded("noseWingTopRound", 0, designNoseWingRoundMax, legacyNoseWingRound);
  const noseWingBaseRound = bounded("noseWingBaseRound", 0, designNoseWingRoundMax, legacyNoseWingRound);
  const topVisorStartX = bounded("topVisorStartX", -100, 94);
  const topVisorEndX = THREE.MathUtils.clamp(
    bounded("topVisorEndX", -100, 100),
    topVisorStartX + 6,
    100
  );
  const topVisorBandHeight = bounded("topVisorBandHeight", 2, 12);
  return {
    hingeStandard: "FL-H1",
    lensThickness: 1,
    lensSeatWidth: bounded("lensSeatWidth", 1, 2),
    lensSeatDepth: bounded("lensSeatDepth", 0.15, 1.2),
    lensClearance: bounded("lensClearance", 0, 0.6),
    lensChannelOffset: bounded("lensChannelOffset", -1, 1),
    hingeMountHeight: bounded("hingeMountHeight", -12, 12),
    hingeMountOffset: bounded("hingeMountOffset", -4, 0),
    bridgeThickness,
    bridgeBlendRadius: bounded("bridgeBlendRadius", 0, 8),
    bridgeTopJoinOffset: bounded("bridgeTopJoinOffset", -18, 18, bridgeThickness / 2),
    bridgeBottomJoinOffset: bounded("bridgeBottomJoinOffset", -18, 18, -bridgeThickness / 2),
    noseWingHeight: bounded("noseWingHeight", 0, 6),
    noseWingAngle: bounded("noseWingAngle", -28, 28),
    noseWingRound: noseWingTopRound,
    noseWingTopRound,
    noseWingBaseRound,
    noseWingTopOffset,
    noseWingBottomOffset,
    noseWingTopShift: bounded("noseWingTopShift", -12, 12),
    noseWingBottomShift: bounded("noseWingBottomShift", -12, 12),
    noseWingTopOuterOffset: bounded("noseWingTopOuterOffset", -34, 8, noseWingTopOffset),
    noseWingTopInnerOffset: bounded("noseWingTopInnerOffset", -34, 8, noseWingTopOffset),
    noseWingBottomInnerOffset: bounded("noseWingBottomInnerOffset", -34, 8, noseWingBottomOffset),
    noseWingBottomOuterOffset: bounded("noseWingBottomOuterOffset", -34, 8, noseWingBottomOffset),
    topVisorEnabled: parseDesignBoolean(construction.topVisorEnabled, defaultDesignConstruction.topVisorEnabled),
    topVisorDepth: bounded("topVisorDepth", 0, 6),
    topVisorBandHeight,
    topVisorRadius: bounded("topVisorRadius", 0, 2.5),
    topVisorStartX,
    topVisorEndX,
    templeStraight,
    templeHook: bounded("templeHook", 10, 60),
    templeHookAngle: bounded("templeHookAngle", 10, 75),
    templeBarHeight: bounded("templeBarHeight", 3, 10),
    templeDepth: bounded("templeDepth", 2.4, 6),
    templeCornerRadius: bounded("templeCornerRadius", 0, 4),
    templeChamferEnabled: parseDesignBoolean(construction.templeChamferEnabled, defaultDesignConstruction.templeChamferEnabled),
    templeChamferAmount: bounded("templeChamferAmount", 0, 1.2),
    templeTextureDepth: bounded("templeTextureDepth", 0.2, 1.2),
    templePatternStart,
    templePatternEnd,
    templePatternSpacing,
    templePatternSize: bounded("templePatternSize", 0.5, 8),
    templeTextSize: bounded("templeTextSize", 2, 8),
    templeTextPosition: bounded("templeTextPosition", 0, 120),
    templeTextYOffset: bounded("templeTextYOffset", -5, 5),
    templeTextDepth: bounded("templeTextDepth", 0.15, 1.2)
  };
}

function estimateTempleTextWidth(text = "", construction = defaultDesignConstruction) {
  const label = String(text || "");
  const size = parseDesignNumber(construction.templeTextSize, defaultDesignConstruction.templeTextSize);
  if (label && designTextFont) {
    const cacheKey = `${label}\u0000${formatNumber(size)}`;
    if (!designTempleTextWidthCache.has(cacheKey)) {
      const geometry = new TextGeometry(label, {
        font: designTextFont,
        size,
        depth: 0.01,
        curveSegments: 1,
        bevelEnabled: false
      });
      geometry.computeBoundingBox();
      const box = geometry.boundingBox;
      const width = box ? Math.max(0, box.max.x - box.min.x) : 0;
      geometry.dispose();
      designTempleTextWidthCache.set(cacheKey, width);
    }
    return designTempleTextWidthCache.get(cacheKey);
  }
  const weight = label.split("").reduce((total, char) => {
    if (char === " ") return total + 0.34;
    if ("ilI1.,'|".includes(char)) return total + 0.3;
    if ("MW@#".includes(char)) return total + 0.92;
    if (char === char.toUpperCase() && /[A-Z0-9]/.test(char)) return total + 0.68;
    return total + 0.56;
  }, 0);
  return Math.max(0, weight * size * 0.9);
}

function designTempleTextBounds(construction, profile, label = "") {
  const width = estimateTempleTextWidth(label, construction);
  const profileWidth = Math.max(...profile.points.map(([x]) => x), construction.templeStraight + construction.templeHook, 1);
  const safeStart = Math.min(designTempleTextSafeStart, Math.max(8, profileWidth - designTempleTextEndPadding));
  const minPosition = Math.min(
    Math.max(8, profileWidth - designTempleTextEndPadding),
    safeStart + width / 2
  );
  const maxPosition = Math.max(minPosition, profileWidth - designTempleTextEndPadding - width / 2);
  const verticalLimit = Math.max(0.2, Math.min(5, construction.templeBarHeight / 2 - construction.templeTextSize * 0.28));
  return { width, safeStart, minPosition, maxPosition, verticalLimit, profileWidth };
}

function longestTempleTextLabel(style) {
  return [style.leftTempleText, style.rightTempleText].reduce((best, label) => (
    String(label || "").length > String(best || "").length ? label : best
  ), "");
}

function normalizeDesignTempleTextPlacement(construction, templeSketch, style) {
  const c = normalizeDesignConstruction(construction);
  if (style.templeDetailMode !== "text") return c;
  const label = longestTempleTextLabel(style);
  if (!label) return c;
  const profile = normalizeDesignTempleSketch(templeSketch, c);
  const bounds = designTempleTextBounds(c, profile, label);
  return {
    ...c,
    templeTextPosition: THREE.MathUtils.clamp(c.templeTextPosition, bounds.minPosition, bounds.maxPosition),
    templeTextYOffset: THREE.MathUtils.clamp(c.templeTextYOffset, -bounds.verticalLimit, bounds.verticalLimit)
  };
}

function normalizeDesignPublicParameters(keys = defaultDesignPublicParameters) {
  const source = Array.isArray(keys) ? keys : defaultDesignPublicParameters;
  return [...new Set(source.filter((key) => designPublicParameterKeys.includes(key)))];
}

function normalizeDesignSliderRanges(ranges = {}) {
  return Object.fromEntries(designPublicParameterKeys.map((key) => {
    const [, , , schemaMin, schemaMax, schemaStep] = parameterSchema.find(([itemKey]) => itemKey === key);
    const supplied = ranges[key] || {};
    const min = THREE.MathUtils.clamp(parseDesignNumber(supplied.min, schemaMin), schemaMin, schemaMax);
    const max = THREE.MathUtils.clamp(parseDesignNumber(supplied.max, schemaMax), schemaMin, schemaMax);
    return [key, { min: Math.min(min, max), max: Math.max(min, max), step: schemaStep }];
  }));
}

function normalizeParametricDesign(design = {}) {
  const construction = normalizeDesignConstruction(design.construction);
  return {
    type: "parametric-openscad",
    ...normalizeDesignStyle(design),
    sketch: normalizeDesignSketch(design.sketch),
    templeSketch: normalizeDesignTempleSketch(design.templeSketch, construction),
    features: normalizeDesignFeatures(design.features),
    construction,
    publicParameters: normalizeDesignPublicParameters(design.publicParameters),
    sliderRanges: normalizeDesignSliderRanges(design.sliderRanges)
  };
}

function designDefinitionFromDraft(draft = state.designDraft) {
  const style = normalizeDesignStyle(draft.style);
  let construction = normalizeDesignConstruction(draft.construction);
  const templeSketch = normalizeDesignTempleSketch(draft.templeSketch, construction);
  construction = normalizeDesignTempleTextPlacement(construction, templeSketch, style);
  return {
    type: "parametric-openscad",
    ...style,
    sketch: normalizeDesignSketch(draft.sketch),
    templeSketch,
    features: normalizeDesignFeatures(draft.features, draft.params),
    construction,
    publicParameters: normalizeDesignPublicParameters(draft.publicParameters),
    sliderRanges: normalizeDesignSliderRanges(draft.sliderRanges)
  };
}

function designGeometryParams(params = state.designDraft.params) {
  const values = { ...structuredClone(defaultParams), ...params };
  parameterSchema.forEach(([key, , , min, max]) => {
    const supplied = Number(values[key]);
    values[key] = THREE.MathUtils.clamp(Number.isFinite(supplied) ? supplied : defaultParams[key], min, max);
  });
  values.temple_spread = 0;
  values.rim_span = designRimSpanForParams(values);
  values.lens_width = Math.max(
    designMinimumLensOpeningWidth,
    (values.rim_span - values.bridge_width) / 2 - values.rim_thickness * 2
  );
  return values;
}

function setupDesignScene() {
  if (!els.designCanvas) return;
  designScene = new THREE.Scene();
  designScene.background = new THREE.Color(sceneBackgroundColor());
  designCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 4000);
  designRenderer = new THREE.WebGLRenderer({ canvas: els.designCanvas, antialias: true, preserveDrawingBuffer: true });
  designRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  designRenderer.outputColorSpace = THREE.SRGBColorSpace;

  designScene.add(new THREE.HemisphereLight("#fff8ef", "#091011", 2.2));
  const key = new THREE.DirectionalLight("#ffffff", 2.7);
  key.position.set(130, 170, 120);
  designScene.add(key);
  const warm = new THREE.DirectionalLight("#ff9c4a", 0.82);
  warm.position.set(-130, 45, -90);
  designScene.add(warm);
  designModelGroup = new THREE.Group();
  designModelGroup.rotation.order = "YXZ";
  designScene.add(designModelGroup);
  designMeasureMarkerGroup = new THREE.Group();
  designScene.add(designMeasureMarkerGroup);
  loadDesignTextFont();
  resizeDesignScene();
}

function loadDesignTextFont() {
  if (designTextFont || designTextFontLoading) return;
  designTextFontLoading = true;
  new FontLoader().load(
    "./assets/vendor/three/examples/fonts/helvetiker_bold.typeface.json",
    (font) => {
      designTextFont = font;
      designTextFontLoading = false;
      if (!els.designLab?.hidden) renderDesignPreview({ fitView: false });
    },
    undefined,
    () => {
      designTextFontLoading = false;
    }
  );
}

async function loadDesignHingeAssets() {
  const entries = await Promise.all(Object.entries(designHingeAssetManifest).map(async ([key, url]) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status}`);
      const parsed = await parse3mfComponent(await response.blob());
      return [key, parsed.object];
    } catch {
      return [key, null];
    }
  }));
  designHingeLibrary = Object.fromEntries(entries);
  renderDesignProductionChecks();
}

function addDesignHingeAsset(key, position, material, target = designModelGroup) {
  const source = designHingeLibrary[key];
  if (!source) return false;
  const hinge = source.clone(true);
  hinge.traverse((child) => {
    if (!child.isMesh) return;
    child.material = material;
    child.geometry.computeVertexNormals();
  });
  // The authored screw bore follows CAD Z; eyewear assembly uses vertical Y.
  hinge.rotation.x = -Math.PI / 2;
  hinge.position.copy(position);
  target.add(hinge);
  return true;
}

function resizeDesignScene() {
  if (!designRenderer || !designCamera || !els.designCanvas) return;
  const rect = els.designCanvas.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  designCamera.aspect = width / height;
  designCamera.updateProjectionMatrix();
  designRenderer.setSize(width, height, false);
}

function designHistorySnapshot() {
  return {
    draft: structuredClone(state.designDraft),
    designSketchSelectedIndex,
    designTempleSketchSelectedIndex
  };
}

function designHistorySnapshotKey(snapshot) {
  return JSON.stringify(snapshot);
}

function updateDesignHistoryControls() {
  if (els.designUndo) els.designUndo.disabled = !designHistory.past.length;
  if (els.designRedo) els.designRedo.disabled = !designHistory.future.length;
}

function resetDesignHistory() {
  designHistory.past = [];
  designHistory.future = [];
  designControlHistoryTarget = null;
  updateDesignHistoryControls();
}

function captureDesignHistory() {
  if (designHistory.restoring) return;
  const snapshot = designHistorySnapshot();
  const key = designHistorySnapshotKey(snapshot);
  const last = designHistory.past[designHistory.past.length - 1];
  if (last?.key === key) return;
  designHistory.past.push({ ...snapshot, key });
  if (designHistory.past.length > designHistoryLimit) designHistory.past.shift();
  designHistory.future = [];
  updateDesignHistoryControls();
}

function captureDesignHistoryFromEvent(event) {
  const target = event?.target;
  if (!target) {
    captureDesignHistory();
    return;
  }
  if (event.type === "input") {
    if (designControlHistoryTarget !== target) {
      captureDesignHistory();
      designControlHistoryTarget = target;
    }
    return;
  }
  if (designControlHistoryTarget === target) {
    designControlHistoryTarget = null;
    return;
  }
  captureDesignHistory();
}

function restoreDesignHistorySnapshot(entry, note) {
  if (!entry) return;
  designHistory.restoring = true;
  state.designDraft = structuredClone(entry.draft);
  designSketchSelectedIndex = entry.designSketchSelectedIndex || 0;
  designTempleSketchSelectedIndex = entry.designTempleSketchSelectedIndex || 0;
  designSketchDragIndex = -1;
  designTempleSketchDragIndex = -1;
  designTempleTextDragState = null;
  clearDesignMeasurement(false);
  buildDesignControls();
  syncDesignFields();
  if (state.designDraft.manualCode && els.designScadCode) {
    els.designScadCode.value = state.designDraft.code || "";
  } else {
    syncDesignCode();
  }
  switchDesignTab(state.designDraft.step || "front");
  setDesignView(state.designDraft.view || "sketch");
  renderDesignPreview({ fitView: false });
  setDesignNote(note || "");
  designHistory.restoring = false;
  updateDesignHistoryControls();
}

function undoDesignChange() {
  if (!designHistory.past.length) return;
  const current = designHistorySnapshot();
  designHistory.future.push({ ...current, key: designHistorySnapshotKey(current) });
  const previous = designHistory.past.pop();
  restoreDesignHistorySnapshot(previous, "Undo applied.");
}

function redoDesignChange() {
  if (!designHistory.future.length) return;
  const current = designHistorySnapshot();
  designHistory.past.push({ ...current, key: designHistorySnapshotKey(current) });
  const next = designHistory.future.pop();
  restoreDesignHistorySnapshot(next, "Redo applied.");
}

function setupDesignSketch() {
  if (!els.designSketchCanvas) return;
  setDesignView("sketch");
  const locatePoint = (event) => {
    if (state.designDraft.step !== "front") return -1;
    const metrics = designSketchMetrics();
    if (!metrics) return -1;
    const rect = els.designSketchCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const points = normalizeDesignSketch(state.designDraft.sketch).points;
    let closest = -1;
    let distance = 14;
    points.forEach((_, index) => {
      const point = sketchScreenPoint(index, metrics);
      const nextDistance = Math.hypot(point.x - x, point.y - y);
      if (nextDistance < distance) {
        closest = index;
        distance = nextDistance;
      }
    });
    designBridgeHandleScreenPoints(metrics).forEach((point, index) => {
      const nextDistance = Math.hypot(point.x - x, point.y - y);
      if (nextDistance < distance) {
        closest = designBridgeHandleSelectionOffset + index;
        distance = nextDistance;
      }
    });
    designNoseWingHandleScreenPoints(metrics).forEach((point) => {
      const nextDistance = Math.hypot(point.x - x, point.y - y);
      if (nextDistance < distance) {
        closest = designNoseWingHandleSelectionOffset + point.handleIndex;
        distance = nextDistance;
      }
    });
    designTopVisorHandleScreenPoints(metrics).forEach((point, index) => {
      const nextDistance = Math.hypot(point.x - x, point.y - y);
      if (nextDistance < distance) {
        closest = designTopVisorHandleSelectionOffset + index;
        distance = nextDistance;
      }
    });
    return closest;
  };
  els.designSketchCanvas.addEventListener("pointerdown", (event) => {
    if (designMeasureMode) {
      addDesignMeasurementPoint(event);
      return;
    }
    if (state.designDraft.step === "left-temple" || state.designDraft.step === "right-temple") {
      const mirrored = state.designDraft.step === "left-temple";
      const metrics = templeSketchMetrics();
      if (!metrics) return;
      const rect = els.designSketchCanvas.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      if (templeTextHitTest(point, metrics, mirrored)) {
        captureDesignHistory();
        designTempleTextDragState = { mirrored };
        els.designSketchCanvas.setPointerCapture(event.pointerId);
        drawDesignSketch();
        return;
      }
      if (state.designDraft.step !== "left-temple") return;
      let closest = -1;
      let distance = 16;
      metrics.screenPoints.forEach((handle, index) => {
        const displayX = mirrored ? metrics.rect.width - handle.x : handle.x;
        const nextDistance = Math.hypot(point.x - displayX, point.y - handle.y);
        if (nextDistance < distance) {
          closest = index;
          distance = nextDistance;
        }
      });
      if (closest >= 0) {
        captureDesignHistory();
        designTempleSketchDragIndex = closest;
        designTempleSketchSelectedIndex = closest;
        syncDesignTempleSelectedCornerField();
        els.designSketchCanvas.setPointerCapture(event.pointerId);
        drawDesignSketch();
      }
      return;
    }
    const index = locatePoint(event);
    if (index < 0) return;
    captureDesignHistory();
    if (isDesignBridgeSelection(index)) {
      designSketchDragIndex = index;
      designSketchSelectedIndex = index;
      els.designSketchCanvas.setPointerCapture(event.pointerId);
      syncDesignSelectedCornerField();
      drawDesignSketch();
      return;
    }
    if (isDesignNoseWingSelection(index)) {
      designSketchDragIndex = index;
      designSketchSelectedIndex = index;
      els.designSketchCanvas.setPointerCapture(event.pointerId);
      syncDesignSelectedCornerField();
      drawDesignSketch();
      return;
    }
    if (isDesignTopVisorSelection(index)) {
      designSketchDragIndex = index;
      designSketchSelectedIndex = index;
      els.designSketchCanvas.setPointerCapture(event.pointerId);
      syncDesignSelectedCornerField();
      drawDesignSketch();
      return;
    }
    designSketchDragIndex = index;
    designSketchSelectedIndex = index;
    els.designSketchCanvas.setPointerCapture(event.pointerId);
    syncDesignSelectedCornerField();
    drawDesignSketch();
  });
  els.designSketchCanvas.addEventListener("pointermove", (event) => {
    if (designTempleTextDragState) {
      updateDraggedTempleText(event, templeSketchMetrics(), designTempleTextDragState.mirrored);
      return;
    }
    if (designTempleSketchDragIndex >= 0) {
      const metrics = templeSketchMetrics();
      const rect = els.designSketchCanvas.getBoundingClientRect();
      if (!metrics || !rect) return;
      const profile = normalizeDesignTempleSketch(state.designDraft.templeSketch, state.designDraft.construction);
      const mirrored = state.designDraft.step === "left-temple";
      const screenX = event.clientX - rect.left;
      const nextX = THREE.MathUtils.clamp(
        mirrored
          ? (metrics.rect.width - screenX - metrics.origin.x) / metrics.scale
          : (screenX - metrics.origin.x) / metrics.scale,
        0,
        150
      );
      const nextY = THREE.MathUtils.clamp((metrics.origin.y - (event.clientY - rect.top)) / metrics.scale, -80, 20);
      profile.points[designTempleSketchDragIndex] = [
        designTempleSketchDragIndex === 0 || designTempleSketchDragIndex === profile.points.length - 1 ? 0 : nextX,
        nextY
      ];
      state.designDraft.templeSketch = profile;
      state.designDraft.params.temple_length = Math.max(...profile.points.map(([x]) => x));
      state.designDraft.manualCode = false;
      syncDesignFields();
      syncDesignCode();
      renderDesignPreview({ fitView: false });
      return;
    }
    const metrics = designSketchMetrics();
    if (!metrics) return;
    if (isDesignBridgeSelection(designSketchDragIndex)) {
      updateDraggedDesignBridgeHandle(event, metrics);
      return;
    }
    if (isDesignNoseWingSelection(designSketchDragIndex)) {
      updateDraggedDesignNoseWingHandle(event, metrics);
      return;
    }
    if (isDesignTopVisorSelection(designSketchDragIndex)) {
      updateDraggedDesignTopVisorHandle(event, metrics);
      return;
    }
    if (designSketchDragIndex < 0) return;
    const rect = els.designSketchCanvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - metrics.rightCenterX) / (metrics.lensWidth * metrics.scale);
    const y = (metrics.centerY - (event.clientY - rect.top)) / (metrics.lensHeight * metrics.scale);
    const sketch = normalizeDesignSketch(state.designDraft.sketch);
    sketch.points[designSketchDragIndex] = [
      THREE.MathUtils.clamp(x, -0.68, 0.68),
      THREE.MathUtils.clamp(y, -0.68, 0.68)
    ];
    state.designDraft.sketch = sketch;
    state.designDraft.manualCode = false;
    syncDesignCode();
    renderDesignPreview({ fitView: false });
  });
  const finish = () => {
    designSketchDragIndex = -1;
    designTempleSketchDragIndex = -1;
    designTempleTextDragState = null;
  };
  els.designSketchCanvas.addEventListener("pointerup", finish);
  els.designSketchCanvas.addEventListener("pointercancel", finish);
}

function currentDesignMeasureStep() {
  if (state.designDraft.view === "3d") return "3d";
  return ["front", "left-temple", "right-temple"].includes(state.designDraft.step)
    ? state.designDraft.step
    : "front";
}

function designMeasurementDistance() {
  if (designMeasurePoints.length < 2) return null;
  const [a, b] = designMeasurePoints;
  return Math.hypot(b.x - a.x, b.y - a.y, (b.z || 0) - (a.z || 0));
}

function clearThreeGroup(group) {
  if (!group) return;
  while (group.children.length) {
    const child = group.children[0];
    group.remove(child);
    child.traverse?.((node) => {
      if (node.geometry?.dispose) node.geometry.dispose();
      if (Array.isArray(node.material)) node.material.forEach((material) => material.dispose?.());
      else node.material?.dispose?.();
    });
  }
}

function renderDesignMeasureMarkers() {
  if (!designMeasureMarkerGroup) return;
  clearThreeGroup(designMeasureMarkerGroup);
  if (designMeasureStep !== "3d" || !designMeasurePoints.length) return;
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff9a3d, depthTest: false });
  designMeasurePoints.forEach((point, index) => {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(index === 0 ? 0.85 : 0.72, 18, 10),
      new THREE.MeshBasicMaterial({ color: 0xff9a3d, depthTest: false })
    );
    marker.position.set(point.x, point.y, point.z || 0);
    marker.renderOrder = 50;
    designMeasureMarkerGroup.add(marker);
  });
  if (designMeasurePoints.length >= 2) {
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(designMeasurePoints.slice(0, 2).map((point) => (
        new THREE.Vector3(point.x, point.y, point.z || 0)
      ))),
      lineMaterial
    );
    line.renderOrder = 49;
    designMeasureMarkerGroup.add(line);
  } else {
    lineMaterial.dispose?.();
  }
}

function updateDesignMeasureUi() {
  if (els.designMeasureToggle) {
    els.designMeasureToggle.classList.toggle("active", designMeasureMode);
    els.designMeasureToggle.setAttribute("aria-pressed", String(designMeasureMode));
  }
  if (els.designMeasureClear) els.designMeasureClear.disabled = !designMeasurePoints.length && !designMeasureMode;
  if (els.designMeasureReadout) {
    const distance = designMeasurementDistance();
    els.designMeasureReadout.textContent = distance !== null
      ? `Measure ${formatNumber(distance)} mm`
      : designMeasureMode
        ? designMeasurePoints.length ? "Measure: pick second point" : "Measure: pick first point"
        : "Measure off";
  }
}

function clearDesignMeasurement(redraw = true) {
  designMeasurePoints = [];
  designMeasureStep = "";
  renderDesignMeasureMarkers();
  updateDesignMeasureUi();
  if (redraw) drawDesignSketch();
}

function setDesignMeasureMode(enabled) {
  designMeasureMode = Boolean(enabled);
  clearDesignMeasurement(false);
  updateDesignMeasureUi();
  if (state.designDraft.view === "3d") renderDesignPreview({ fitView: false });
  else drawDesignSketch();
}

function designMeasurementPointFromEvent(event) {
  const step = currentDesignMeasureStep();
  if (step === "3d") {
    const rect = els.designCanvas?.getBoundingClientRect();
    if (!rect || !designCamera || !designModelGroup) return null;
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, designCamera);
    const meshes = [];
    designModelGroup.updateMatrixWorld(true);
    designModelGroup.traverse((child) => {
      if (child.isMesh) meshes.push(child);
    });
    const hit = raycaster.intersectObjects(meshes, false)[0];
    if (!hit) return null;
    return { step, x: hit.point.x, y: hit.point.y, z: hit.point.z };
  }
  const rect = els.designSketchCanvas?.getBoundingClientRect();
  if (!rect) return null;
  const screenX = event.clientX - rect.left;
  const screenY = event.clientY - rect.top;
  if (step === "left-temple" || step === "right-temple") {
    const metrics = templeSketchMetrics();
    if (!metrics) return null;
    const mirrored = step === "left-temple";
    return {
      step,
      x: mirrored
        ? (metrics.rect.width - screenX - metrics.origin.x) / metrics.scale
        : (screenX - metrics.origin.x) / metrics.scale,
      y: (metrics.origin.y - screenY) / metrics.scale
    };
  }
  const metrics = designSketchMetrics();
  if (!metrics) return null;
  return {
    step,
    x: (screenX - metrics.centerX) / metrics.scale,
    y: (metrics.centerY - screenY) / metrics.scale
  };
}

function addDesignMeasurementPoint(event) {
  const point = designMeasurementPointFromEvent(event);
  if (!point) return;
  if (designMeasureStep !== point.step || designMeasurePoints.length >= 2) {
    designMeasureStep = point.step;
    designMeasurePoints = [];
  }
  designMeasurePoints.push(point);
  renderDesignMeasureMarkers();
  updateDesignMeasureUi();
  if (point.step === "3d") renderDesignPreview({ fitView: false });
  else drawDesignSketch();
}

function drawDesignMeasurementOverlay(ctx, colors, toScreen, step) {
  if (!designMeasurePoints.length || designMeasureStep !== step) return;
  const points = designMeasurePoints.map(toScreen).filter(Boolean);
  if (!points.length) return;
  ctx.save();
  ctx.strokeStyle = colors.dimension;
  ctx.fillStyle = colors.dimension;
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 5]);
  if (points.length >= 2) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.stroke();
    const distance = designMeasurementDistance();
    if (distance !== null) {
      const midX = (points[0].x + points[1].x) / 2;
      const midY = (points[0].y + points[1].y) / 2;
      ctx.setLineDash([]);
      ctx.font = "700 12px Inter, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = `${formatNumber(distance)} mm`;
      const labelWidth = ctx.measureText(label).width + 16;
      ctx.fillStyle = "rgba(10, 11, 11, 0.82)";
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(midX - labelWidth / 2, midY - 13, labelWidth, 26, 7);
        ctx.fill();
      } else {
        ctx.fillRect(midX - labelWidth / 2, midY - 13, labelWidth, 26);
      }
      ctx.fillStyle = colors.text;
      ctx.fillText(label, midX, midY + 1);
    }
  }
  points.forEach((point, index) => {
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(point.x, point.y, index === 0 ? 5.5 : 5, 0, Math.PI * 2);
    ctx.fillStyle = index === 0 ? colors.accent : colors.text;
    ctx.fill();
    ctx.strokeStyle = colors.background;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
  ctx.restore();
}

function setDesignView(view) {
  const sketch = view !== "3d";
  state.designDraft.view = sketch ? "sketch" : "3d";
  if (designMeasureMode) clearDesignMeasurement(false);
  els.designSketchCanvas?.classList.toggle("design-view-hidden", !sketch);
  els.designCanvas?.classList.toggle("design-view-hidden", sketch);
  els.designViewSketch?.classList.toggle("active", sketch);
  els.designView3d?.classList.toggle("active", !sketch);
  if (els.designViewHint) {
    if (!sketch) els.designViewHint.textContent = "Drag to rotate / Scroll to zoom";
    else if (state.designDraft.step === "left-temple") {
      els.designViewHint.textContent = "Drag the orange handles to define the temple path";
    } else if (state.designDraft.step === "right-temple") {
      els.designViewHint.textContent = "Mirrored fit from the left temple / Edit readable detail on the right";
    } else {
      els.designViewHint.textContent = "Drag profile points to define the lens opening";
    }
  }
  syncDesignStageToolbar();
  if (sketch) drawDesignSketch();
  else {
    resizeDesignScene();
    renderDesignPreview({ fitView: false });
  }
  updateDesignMeasureUi();
}

function syncDesignStageToolbar() {
  const mode = state.designDraft.step || "front";
  const sketchMode = state.designDraft.view !== "3d";
  const showFrontTools = sketchMode && mode === "front";
  const showTempleTools = sketchMode && mode === "left-temple";
  if (els.designFrontPointTools) els.designFrontPointTools.hidden = !showFrontTools;
  if (els.designTemplePointTools) els.designTemplePointTools.hidden = !showTempleTools;
  els.designStageTools?.classList.toggle("has-point-tools", showFrontTools || showTempleTools);
}

function designSketchMetrics() {
  if (!els.designSketchCanvas) return null;
  const rect = els.designSketchCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const p = designGeometryParams();
  const usableWidth = Math.max(100, rect.width - 132);
  const usableHeight = Math.max(100, rect.height - 148);
  const scale = Math.min(usableWidth / (p.head_width + 20), usableHeight / (p.lens_height + p.rim_thickness * 4 + 32));
  const lensWidth = p.lens_width;
  const lensHeight = p.lens_height;
  const rightCenterX = rect.width / 2 + (p.bridge_width / 2 + lensWidth / 2 + p.rim_thickness) * scale;
  return {
    rect,
    p,
    scale,
    lensWidth,
    lensHeight,
    centerX: rect.width / 2,
    centerY: rect.height / 2 + 16,
    rightCenterX,
    leftCenterX: rect.width - rightCenterX
  };
}

function templeSketchMetrics() {
  if (!els.designSketchCanvas) return null;
  const rect = els.designSketchCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const style = normalizeDesignStyle(state.designDraft.style);
  let c = normalizeDesignConstruction(state.designDraft.construction);
  const rawProfile = normalizeDesignTempleSketch(state.designDraft.templeSketch, c);
  c = normalizeDesignTempleTextPlacement(c, rawProfile, style);
  const profile = normalizeDesignTempleSketch(state.designDraft.templeSketch, c);
  const usableWidth = Math.max(100, rect.width - 156);
  const usableHeight = Math.max(100, rect.height - 180);
  const totalWidth = Math.max(...profile.points.map(([x]) => x), 1);
  const top = Math.max(...profile.points.map(([, y]) => y));
  const bottom = Math.min(...profile.points.map(([, y]) => y));
  const totalHeight = top - bottom + 18;
  const scale = Math.min(usableWidth / Math.max(100, totalWidth), usableHeight / Math.max(45, totalHeight));
  const origin = { x: 86, y: Math.max(180, rect.height * 0.38) };
  const screenPoints = profile.points.map(([x, y]) => ({ x: origin.x + x * scale, y: origin.y - y * scale }));
  return { rect, construction: c, profile, scale, origin, screenPoints, totalWidth, top, bottom };
}

function templeSketchScreenX(metrics, x, mirrored = false) {
  const screenX = metrics.origin.x + x * metrics.scale;
  return mirrored ? metrics.rect.width - screenX : screenX;
}

function measureTempleTextScreenWidth(label, fontSize) {
  if (!label) return 0;
  if (!designTempleTextMeasureCanvas) designTempleTextMeasureCanvas = document.createElement("canvas");
  const ctx = designTempleTextMeasureCanvas.getContext("2d");
  ctx.font = `700 ${fontSize}px Inter, Arial, sans-serif`;
  return ctx.measureText(label).width;
}

function templeTextScreenFontSize(construction, scale, label = "") {
  const size = parseDesignNumber(construction.templeTextSize, defaultDesignConstruction.templeTextSize);
  const fallback = Math.max(10, Math.min(80, size * scale));
  const targetWidth = estimateTempleTextWidth(label, construction) * scale;
  const sampleWidth = measureTempleTextScreenWidth(label, 100);
  if (!label || targetWidth <= 0 || sampleWidth <= 0) return fallback;
  return Math.max(10, Math.min(80, targetWidth / sampleWidth * 100));
}

function templeTextScreenBox(metrics, mirrored = false, label = "") {
  const { construction: c, origin, scale } = metrics;
  const fontSize = templeTextScreenFontSize(c, scale, label);
  const width = Math.max(12, measureTempleTextScreenWidth(label, fontSize));
  const height = Math.max(14, fontSize * 1.05);
  const center = {
    x: templeSketchScreenX(metrics, c.templeTextPosition, mirrored),
    y: origin.y - c.templeTextYOffset * scale
  };
  return {
    ...center,
    fontSize,
    width,
    height,
    left: center.x - width / 2,
    right: center.x + width / 2,
    top: center.y - height / 2,
    bottom: center.y + height / 2
  };
}

function templeTextHitTest(point, metrics, mirrored = false) {
  const style = normalizeDesignStyle(state.designDraft.style);
  if (style.templeDetailMode !== "text") return false;
  const label = mirrored ? style.leftTempleText : style.rightTempleText;
  if (!label) return false;
  const box = templeTextScreenBox(metrics, mirrored, label);
  return point.x >= box.left - 8 && point.x <= box.right + 8 && point.y >= box.top - 8 && point.y <= box.bottom + 8;
}

function updateDraggedTempleText(event, metrics, mirrored = false) {
  if (!metrics || !els.designSketchCanvas) return;
  const rect = els.designSketchCanvas.getBoundingClientRect();
  const screenX = event.clientX - rect.left;
  const screenY = event.clientY - rect.top;
  const localX = mirrored
    ? (metrics.rect.width - screenX - metrics.origin.x) / metrics.scale
    : (screenX - metrics.origin.x) / metrics.scale;
  const localY = (metrics.origin.y - screenY) / metrics.scale;
  const current = normalizeDesignConstruction(state.designDraft.construction);
  const style = normalizeDesignStyle(state.designDraft.style);
  const label = longestTempleTextLabel(style);
  const bounds = designTempleTextBounds(current, metrics.profile, label);
  state.designDraft.construction = normalizeDesignConstruction({
    ...state.designDraft.construction,
    templeTextPosition: THREE.MathUtils.clamp(localX, bounds.minPosition, bounds.maxPosition),
    templeTextYOffset: THREE.MathUtils.clamp(localY, -bounds.verticalLimit, bounds.verticalLimit)
  });
  state.designDraft.manualCode = false;
  syncDesignFields();
  syncDesignCode();
  renderDesignPreview({ fitView: false });
}

function sketchScreenPoint(index, metrics) {
  const [x, y] = normalizeDesignSketch(state.designDraft.sketch).points[index];
  return {
    x: metrics.rightCenterX + x * metrics.lensWidth * metrics.scale,
    y: metrics.centerY - y * metrics.lensHeight * metrics.scale
  };
}

function isDesignBridgeSelection(index) {
  return index >= designBridgeHandleSelectionOffset && index < designNoseWingHandleSelectionOffset;
}

function designBridgeSelectionHandleIndex(index) {
  return index - designBridgeHandleSelectionOffset;
}

function isDesignNoseWingSelection(index) {
  return index >= designNoseWingHandleSelectionOffset && index < designNoseWingHandleSelectionOffset + 4;
}

function designNoseWingSelectionHandleIndex(index) {
  return index - designNoseWingHandleSelectionOffset;
}

function isDesignTopVisorSelection(index) {
  return index >= designTopVisorHandleSelectionOffset && index < designTopVisorHandleSelectionOffset + 2;
}

function designTopVisorSelectionHandleIndex(index) {
  return index - designTopVisorHandleSelectionOffset;
}

function designNoseWingHandleLabel(index) {
  return [
    "Top outer nose wing point",
    "Top inner nose wing point",
    "Bottom inner nose wing point",
    "Bottom outer nose wing point"
  ][THREE.MathUtils.clamp(index, 0, 3)] || "Nose wing point";
}

function designBridgeHandlePoints(p, definition = state.designDraft) {
  const bridge = designBridgeMetrics(p, definition);
  return [
    { x: bridge.topHalfWidth, y: bridge.topJoinY },
    { x: bridge.bottomHalfWidth, y: bridge.bottomJoinY }
  ];
}

function designBridgeHandleScreenPoints(metrics) {
  return designBridgeHandlePoints(metrics.p, state.designDraft).map((point) => ({
    x: metrics.centerX + point.x * metrics.scale,
    y: metrics.centerY - point.y * metrics.scale
  }));
}

function designNoseWingHandleScreenPoints(metrics) {
  if (!metrics) return [];
  const construction = normalizeDesignConstruction(state.designDraft.construction);
  if (construction.noseWingHeight <= 0.02) return [];
  return [-1, 1].flatMap((side) => (
    designNoseWingCornerPoints(metrics.p, state.designDraft, side).map((corner) => {
      const [x, y] = corner.point;
      return {
        x: metrics.centerX + x * metrics.scale,
        y: metrics.centerY - y * metrics.scale,
        handleIndex: corner.handleIndex,
        side
      };
    })
  ));
}

function designTopVisorHandleScreenPoints(metrics) {
  if (!metrics) return [];
  const controls = designTopVisorControls(metrics.p, state.designDraft);
  if (!controls.enabled || controls.depth <= 0.02) return [];
  return [
    { x: controls.startX, y: controls.handleY },
    { x: controls.endX, y: controls.handleY }
  ].map((point) => ({
    x: metrics.centerX + point.x * metrics.scale,
    y: metrics.centerY - point.y * metrics.scale
  }));
}

function updateDraggedDesignBridgeHandle(event, metrics) {
  if (!metrics || !els.designSketchCanvas) return;
  const rect = els.designSketchCanvas.getBoundingClientRect();
  const handleIndex = THREE.MathUtils.clamp(designBridgeSelectionHandleIndex(designSketchDragIndex), 0, 1);
  const p = metrics.p;
  const construction = normalizeDesignConstruction(state.designDraft.construction);
  const bridge = designBridgeMetrics(p, state.designDraft);
  const rim = designOuterRimRing(1, p, state.designDraft);
  const rimMinY = Math.min(...rim.map(([, y]) => y));
  const rimMaxY = Math.max(...rim.map(([, y]) => y));
  const pointerY = (metrics.centerY - (event.clientY - rect.top)) / metrics.scale;
  const minSeparation = Math.max(2.2, p.rim_thickness * 0.72);
  const baseY = bridge.centerY;
  let topJoinY = bridge.topJoinY;
  let bottomJoinY = bridge.bottomJoinY;
  if (handleIndex === 0) {
    topJoinY = THREE.MathUtils.clamp(pointerY, bottomJoinY + minSeparation, rimMaxY - 0.2);
  } else {
    bottomJoinY = THREE.MathUtils.clamp(pointerY, rimMinY + 0.2, topJoinY - minSeparation);
  }
  state.designDraft.construction = normalizeDesignConstruction({
    ...construction,
    bridgeTopJoinOffset: topJoinY - baseY,
    bridgeBottomJoinOffset: bottomJoinY - baseY
  });
  state.designDraft.manualCode = false;
  syncDesignFields();
  syncDesignCode();
  renderDesignPreview({ fitView: false });
}

function updateDraggedDesignNoseWingHandle(event, metrics) {
  if (!metrics || !els.designSketchCanvas) return;
  const rect = els.designSketchCanvas.getBoundingClientRect();
  const p = metrics.p;
  const construction = normalizeDesignConstruction(state.designDraft.construction);
  const controls = designNoseWingControls(p, state.designDraft);
  const handleIndex = THREE.MathUtils.clamp(designNoseWingSelectionHandleIndex(designSketchDragIndex), 0, 3);
  const pointerY = (metrics.centerY - (event.clientY - rect.top)) / metrics.scale;
  let nextTopOuterOffset = controls.topOuterOffset;
  let nextTopInnerOffset = controls.topInnerOffset;
  let nextBottomInnerOffset = controls.bottomInnerOffset;
  let nextBottomOuterOffset = controls.bottomOuterOffset;
  const pointerOffset = pointerY - controls.bridge.bottomJoinY;
  if (handleIndex === 0) {
    nextTopOuterOffset = THREE.MathUtils.clamp(pointerOffset, nextBottomOuterOffset + controls.minGap, 8);
  } else if (handleIndex === 1) {
    nextTopInnerOffset = THREE.MathUtils.clamp(pointerOffset, nextBottomInnerOffset + controls.minGap, 8);
  } else if (handleIndex === 2) {
    nextBottomInnerOffset = THREE.MathUtils.clamp(pointerOffset, -34, nextTopInnerOffset - controls.minGap);
  } else {
    nextBottomOuterOffset = THREE.MathUtils.clamp(pointerOffset, -34, nextTopOuterOffset - controls.minGap);
  }
  const nextTopOffset = (nextTopOuterOffset + nextTopInnerOffset) / 2;
  const nextBottomOffset = (nextBottomOuterOffset + nextBottomInnerOffset) / 2;
  state.designDraft.construction = normalizeDesignConstruction({
    ...construction,
    noseWingTopOffset: nextTopOffset,
    noseWingBottomOffset: nextBottomOffset,
    noseWingTopShift: 0,
    noseWingBottomShift: 0,
    noseWingTopOuterOffset: nextTopOuterOffset,
    noseWingTopInnerOffset: nextTopInnerOffset,
    noseWingBottomInnerOffset: nextBottomInnerOffset,
    noseWingBottomOuterOffset: nextBottomOuterOffset
  });
  state.designDraft.manualCode = false;
  syncDesignFields();
  syncDesignCode();
  renderDesignPreview({ fitView: false });
}

function updateDraggedDesignTopVisorHandle(event, metrics) {
  if (!metrics || !els.designSketchCanvas) return;
  const rect = els.designSketchCanvas.getBoundingClientRect();
  const handleIndex = THREE.MathUtils.clamp(designTopVisorSelectionHandleIndex(designSketchDragIndex), 0, 1);
  const construction = normalizeDesignConstruction(state.designDraft.construction);
  const controls = designTopVisorControls(metrics.p, state.designDraft);
  const pointerX = (event.clientX - rect.left - metrics.centerX) / metrics.scale;
  const minGap = controls.minGap;
  let startX = controls.startX;
  let endX = controls.endX;
  if (handleIndex === 0) {
    startX = THREE.MathUtils.clamp(pointerX, controls.minX, endX - minGap);
  } else {
    endX = THREE.MathUtils.clamp(pointerX, startX + minGap, controls.maxX);
  }
  state.designDraft.construction = normalizeDesignConstruction({
    ...construction,
    topVisorStartX: startX,
    topVisorEndX: endX
  });
  state.designDraft.manualCode = false;
  syncDesignFields();
  syncDesignCode();
  renderDesignPreview({ fitView: false });
}

function drawSketchProfile(ctx, centerX, metrics, expansion, fill, stroke, mirror = false) {
  const p = { ...metrics.p, lens_width: metrics.lensWidth, lens_height: metrics.lensHeight };
  const shapedPoints = designLocalOutlineRing(p, state.designDraft, expansion).map(([x, y]) => ({
    x: centerX + (mirror ? -x : x) * metrics.scale,
    y: metrics.centerY - y * metrics.scale
  }));
  if (!shapedPoints.length) return;
  ctx.beginPath();
  ctx.moveTo(shapedPoints[0].x, shapedPoints[0].y);
  shapedPoints.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = expansion ? 2 : 1.25;
  ctx.stroke();
}

function sketchDimension(ctx, x1, y1, x2, y2, label) {
  const colors = designDrawingColors();
  ctx.strokeStyle = colors.dimension;
  ctx.fillStyle = colors.dimension;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const angle = Math.atan2(y2 - y1, x2 - x1);
  [[x1, y1, angle], [x2, y2, angle + Math.PI]].forEach(([x, y, direction]) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(direction + 0.42) * 10, y + Math.sin(direction + 0.42) * 10);
    ctx.lineTo(x + Math.cos(direction - 0.42) * 10, y + Math.sin(direction - 0.42) * 10);
    ctx.closePath();
    ctx.fill();
  });
  ctx.font = "600 12px Inter, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, (x1 + x2) / 2, (y1 + y2) / 2 - 8);
}

function designDrawingColors() {
  const styles = getComputedStyle(document.documentElement);
  const read = (key, fallback) => styles.getPropertyValue(key).trim() || fallback;
  return {
    background: read("--scene-bg-2", "#0c0d0d"),
    grid: read("--line", "#292c2c"),
    axis: read("--line-strong", "#3a3d3d"),
    stroke: read("--accent-2", "#df8955"),
    accent: read("--accent", "#c96b34"),
    dimension: read("--accent-2", "#df8955"),
    text: read("--ink", "#f3dfc2"),
    muted: read("--muted", "#aaa39c"),
    fill: read("--accent-soft", "rgba(201,107,52,.14)")
  };
}

function prepareDesignDrawingCanvas(canvas, rect) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const colors = designDrawingColors();
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, rect.width, rect.height);
  const grid = 40;
  for (let x = 0, column = 0; x < rect.width; x += grid, column += 1) {
    ctx.globalAlpha = column % 5 === 0 ? 0.72 : 0.28;
    ctx.strokeStyle = column % 5 === 0 ? colors.axis : colors.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, rect.height);
    ctx.stroke();
  }
  for (let y = 0, row = 0; y < rect.height; y += grid, row += 1) {
    ctx.globalAlpha = row % 5 === 0 ? 0.72 : 0.28;
    ctx.strokeStyle = row % 5 === 0 ? colors.axis : colors.grid;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(rect.width, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return { ctx, colors };
}

function drawTempleHingeDatum(ctx, metrics, mirrored, colors) {
  const { origin, scale } = metrics;
  const hingeLength = 6.25;
  const hingeHeight = 4.5;
  const overlap = designTempleArmJoinOverlap;
  const bodyStart = templeSketchScreenX(metrics, -hingeLength + overlap, mirrored);
  const bodyEnd = templeSketchScreenX(metrics, overlap, mirrored);
  const left = Math.min(bodyStart, bodyEnd);
  const width = Math.abs(bodyEnd - bodyStart);
  const height = hingeHeight * scale;
  const top = origin.y - height / 2;
  const rearFaceX = templeSketchScreenX(metrics, overlap, mirrored);
  const screwX = templeSketchScreenX(metrics, -hingeLength * 0.45 + overlap, mirrored);
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.fillRect(left + scale * 0.28, top + scale * 0.22, width, height);
  ctx.fillStyle = colors.accent;
  ctx.strokeStyle = colors.stroke;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(left, top, width, height, Math.min(3, height * 0.18));
  else ctx.rect(left, top, width, height);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.14)";
  ctx.fillRect(left + width * 0.08, top + height * 0.16, width * 0.52, height * 0.16);
  ctx.strokeStyle = colors.background;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(rearFaceX, top - scale * 0.18);
  ctx.lineTo(rearFaceX, top + height + scale * 0.18);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(screwX, origin.y, Math.max(2.4, height * 0.18), 0, Math.PI * 2);
  ctx.fillStyle = colors.background;
  ctx.fill();
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.restore();
}

function drawTempleTextSafetyZone(ctx, metrics, mirrored, colors, displayPoints) {
  const style = normalizeDesignStyle(state.designDraft.style);
  const bounds = designTempleTextBounds(metrics.construction, metrics.profile, longestTempleTextLabel(style));
  const startX = templeSketchScreenX(metrics, 0, mirrored);
  const endX = templeSketchScreenX(metrics, bounds.safeStart, mirrored);
  const left = Math.min(startX, endX);
  const width = Math.abs(endX - startX);
  if (width < 1) return;
  ctx.save();
  ctx.beginPath();
  traceRoundedPolygon(ctx, displayPoints, metrics.profile.cornerRadii.map((radius) => radius * metrics.scale));
  ctx.clip();
  ctx.fillStyle = "rgba(10, 11, 11, 0.14)";
  ctx.fillRect(left, metrics.origin.y - 30 * metrics.scale, width, 60 * metrics.scale);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = "rgba(245, 229, 195, 0.45)";
  ctx.lineWidth = 1.4;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(endX, metrics.origin.y - Math.max(18, metrics.construction.templeBarHeight * metrics.scale * 0.85));
  ctx.lineTo(endX, metrics.origin.y + Math.max(18, metrics.construction.templeBarHeight * metrics.scale * 0.85));
  ctx.stroke();
  ctx.restore();
}

function drawTemplePatternPreview(ctx, pattern, x, y, scale, construction, index, mirrored) {
  const detailSize = Math.max(0.5, parseDesignNumber(construction.templePatternSize, defaultDesignConstruction.templePatternSize));
  const segment = Math.max(1.5, detailSize * scale);
  const markHeight = Math.max(2, Math.min(construction.templeBarHeight * scale * 0.72, segment * 1.1));
  const dotRadius = Math.max(1.45, Math.min(3.6, detailSize * scale * 0.36));
  const mirror = mirrored ? -1 : 1;
  const line = (length, angle = 0, offsetX = 0, offsetY = 0) => {
    ctx.save();
    ctx.translate(x + mirror * offsetX * scale, y + offsetY * scale);
    ctx.rotate((mirrored ? -angle : angle));
    ctx.beginPath();
    ctx.moveTo(-length / 2, 0);
    ctx.lineTo(length / 2, 0);
    ctx.stroke();
    ctx.restore();
  };
  if (pattern === "ribs") {
    line(markHeight, Math.PI / 2);
  } else if (pattern === "micro-ribs") {
    const offset = Math.min(1.25, detailSize * 0.28);
    line(markHeight * 0.82, Math.PI / 2, -offset);
    line(markHeight * 0.82, Math.PI / 2, offset);
  } else if (pattern === "slots") {
    line(segment, 0);
  } else if (pattern === "dots") {
    const fill = ctx.fillStyle;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = fill;
  } else if (pattern === "diamond") {
    line(segment, Math.PI / 4);
    line(segment, -Math.PI / 4);
  } else {
    line(segment, (index % 2 ? -1 : 1) * Math.PI / 5);
  }
}

function drawTempleSketch(mirrored = false) {
  const canvas = els.designSketchCanvas;
  const metrics = templeSketchMetrics();
  if (!canvas || !metrics) return;
  const { ctx, colors } = prepareDesignDrawingCanvas(canvas, metrics.rect);
  const { construction: c, profile, screenPoints, origin, scale, rect, totalWidth } = metrics;
  const style = normalizeDesignStyle(state.designDraft.style);
  const flipX = (x) => mirrored ? rect.width - x : x;
  const point = ({ x, y }) => ({ x: flipX(x), y });
  const displayPoints = screenPoints.map(point);
  ctx.strokeStyle = colors.axis;
  ctx.beginPath();
  ctx.moveTo(0, origin.y);
  ctx.lineTo(rect.width, origin.y);
  ctx.stroke();
  ctx.fillStyle = colors.fill;
  ctx.strokeStyle = colors.stroke;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.beginPath();
  traceRoundedPolygon(ctx, displayPoints, profile.cornerRadii.map((radius) => radius * scale));
  ctx.fill();
  ctx.stroke();
  drawTempleTextSafetyZone(ctx, metrics, mirrored, colors, displayPoints);
  if (style.templeDetailMode === "texture") {
    ctx.save();
    ctx.beginPath();
    traceRoundedPolygon(ctx, displayPoints, profile.cornerRadii.map((radius) => radius * scale));
    ctx.clip();
    ctx.strokeStyle = style.detailColor;
    ctx.fillStyle = style.detailColor;
    ctx.lineWidth = Math.max(1.25, c.templeTextureDepth * scale * 0.45);
    const start = Math.max(0, c.templePatternStart);
    const end = Math.min(c.templePatternEnd, c.templeStraight - 4);
    for (let z = start, index = 0; z <= end; z += c.templePatternSpacing, index += 1) {
      const x = point({ x: origin.x + z * scale, y: origin.y }).x;
      drawTemplePatternPreview(ctx, style.templePattern, x, origin.y, scale, c, index, mirrored);
    }
    ctx.restore();
  }
  if (style.templeDetailMode === "text") {
    const label = mirrored ? style.leftTempleText : style.rightTempleText;
    if (label) {
      const textBox = templeTextScreenBox(metrics, mirrored, label);
      ctx.save();
      ctx.fillStyle = colors.dimension;
      ctx.font = `700 ${textBox.fontSize}px Inter, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, textBox.x, textBox.y);
      ctx.globalAlpha = designTempleTextDragState?.mirrored === mirrored ? 0.95 : 0.42;
      ctx.strokeStyle = colors.dimension;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(textBox.left, textBox.top, textBox.width, textBox.height);
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(textBox.x, textBox.y, Math.max(3.2, textBox.height * 0.12), 0, Math.PI * 2);
      ctx.fillStyle = colors.accent;
      ctx.fill();
      ctx.restore();
    }
  }
  drawTempleHingeDatum(ctx, metrics, mirrored, colors);
  if (state.designDraft.step === "left-temple") {
    displayPoints.forEach((handle, index) => {
      ctx.beginPath();
      ctx.arc(handle.x, handle.y, index === designTempleSketchSelectedIndex ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = index === designTempleSketchSelectedIndex ? colors.accent : colors.text;
      ctx.fill();
      ctx.strokeStyle = colors.text;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }
  const straightX = origin.x + c.templeStraight * scale;
  const upperY = origin.y - metrics.top * scale - 48;
  sketchDimension(ctx, point({ x: origin.x, y: upperY }).x, upperY, point({ x: straightX, y: upperY }).x, upperY, `${formatNumber(c.templeStraight)} mm datum`);
  const lowerY = origin.y - metrics.bottom * scale + 42;
  sketchDimension(ctx, point({ x: origin.x, y: lowerY }).x, lowerY, point({ x: origin.x + totalWidth * scale, y: lowerY }).x, lowerY, `${formatNumber(totalWidth)} mm profile`);
  drawDesignMeasurementOverlay(ctx, colors, (measurement) => ({
    x: point({ x: origin.x + measurement.x * scale, y: origin.y }).x,
    y: origin.y - measurement.y * scale
  }), state.designDraft.step);
  ctx.fillStyle = colors.text;
  ctx.font = "700 13px Inter, Arial, sans-serif";
  ctx.textAlign = mirrored ? "right" : "left";
  ctx.fillText(mirrored ? "TEMPLE HINGE LEFT / WEARER SIDE" : "TEMPLE HINGE RIGHT / WEARER SIDE", mirrored ? rect.width - 38 : 38, 188);
  ctx.font = "500 12px Inter, Arial, sans-serif";
  ctx.fillStyle = colors.muted;
  ctx.fillText("Closed extruded profile / select a vertex to round it", mirrored ? rect.width - 38 : 38, 208);
}

function drawDesignSketch() {
  const canvas = els.designSketchCanvas;
  const metrics = designSketchMetrics();
  if (!canvas || !metrics) return;
  if (state.designDraft.step === "left-temple" || state.designDraft.step === "right-temple") {
    drawTempleSketch(state.designDraft.step === "left-temple");
    return;
  }
  const { ctx, colors } = prepareDesignDrawingCanvas(canvas, metrics.rect);
  const { rect, p, scale, centerX, centerY, leftCenterX, rightCenterX } = metrics;
  ctx.strokeStyle = colors.axis;
  ctx.beginPath();
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, rect.height);
  ctx.moveTo(0, centerY);
  ctx.lineTo(rect.width, centerY);
  ctx.stroke();
  const construction = normalizeDesignConstruction(state.designDraft.construction);
  drawDesignFrontPlanarProfile(ctx, metrics, colors);
  drawDesignTopVisorSketch(ctx, metrics, state.designDraft.style);
  drawDesignNoseWingsSketch(ctx, metrics, state.designDraft.style);
  const hingeSize = designHingePadSize * scale;
  const hingeY = centerY - construction.hingeMountHeight * scale;
  const hingeLeftCenter = designHingePadCenter(-1, p, state.designDraft);
  const hingeRightCenter = designHingePadCenter(1, p, state.designDraft);
  const hingeLeftX = centerX + hingeLeftCenter.x * scale;
  const hingeRightX = centerX + hingeRightCenter.x * scale;
  ctx.fillStyle = colors.muted;
  ctx.font = "600 11px Inter, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("LH PAD", hingeLeftX - hingeSize / 2, hingeY + 15);
  ctx.fillText("RH PAD", hingeRightX + hingeSize / 2, hingeY + 15);
  normalizeDesignSketch(state.designDraft.sketch).points.forEach((_, index) => {
    const point = sketchScreenPoint(index, metrics);
    ctx.beginPath();
    ctx.arc(point.x, point.y, index === designSketchSelectedIndex ? 6 : 4.5, 0, Math.PI * 2);
    ctx.fillStyle = index === designSketchSelectedIndex ? colors.accent : colors.text;
    ctx.fill();
    ctx.strokeStyle = colors.background;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
  designBridgeHandleScreenPoints(metrics).forEach((point, index) => {
    const selectionIndex = designBridgeHandleSelectionOffset + index;
    const selected = designSketchSelectedIndex === selectionIndex;
    ctx.beginPath();
    ctx.arc(point.x, point.y, selected ? 6 : 4.5, 0, Math.PI * 2);
    ctx.fillStyle = selected ? colors.accent : colors.text;
    ctx.fill();
    ctx.strokeStyle = colors.background;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
  designNoseWingHandleScreenPoints(metrics).forEach((point) => {
    const selectionIndex = designNoseWingHandleSelectionOffset + point.handleIndex;
    const selected = designSketchSelectedIndex === selectionIndex;
    ctx.beginPath();
    ctx.arc(point.x, point.y, selected ? 6.5 : 4.8, 0, Math.PI * 2);
    ctx.fillStyle = selected ? colors.accent : normalizeDesignStyle(state.designDraft.style).detailColor;
    ctx.fill();
    ctx.strokeStyle = colors.background;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
  designTopVisorHandleScreenPoints(metrics).forEach((point, index) => {
    const selectionIndex = designTopVisorHandleSelectionOffset + index;
    const selected = designSketchSelectedIndex === selectionIndex;
    ctx.beginPath();
    ctx.arc(point.x, point.y, selected ? 6.5 : 4.8, 0, Math.PI * 2);
    ctx.fillStyle = selected ? colors.accent : normalizeDesignStyle(state.designDraft.style).detailColor;
    ctx.fill();
    ctx.strokeStyle = colors.background;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
  const topY = centerY - (p.lens_height / 2 + p.rim_thickness + 14) * scale;
  sketchDimension(ctx, centerX - p.head_width * scale / 2, topY, centerX + p.head_width * scale / 2, topY, `${formatNumber(p.head_width)} mm overall width`);
  const bridge = designBridgeMetrics(p, state.designDraft);
  const bridgeY = centerY - (bridge.centerY + bridge.height / 2 + 10) * scale;
  sketchDimension(ctx, centerX - p.bridge_width * scale / 2, bridgeY, centerX + p.bridge_width * scale / 2, bridgeY, `${formatNumber(p.bridge_width)} mm bridge`);
  const heightX = rightCenterX + (p.lens_width / 2 + p.rim_thickness + 12) * scale;
  sketchDimension(ctx, heightX, centerY - p.lens_height * scale / 2, heightX, centerY + p.lens_height * scale / 2, `${formatNumber(p.lens_height)} mm`);
  drawDesignMeasurementOverlay(ctx, colors, (measurement) => ({
    x: centerX + measurement.x * scale,
    y: centerY - measurement.y * scale
  }), "front");
  ctx.fillStyle = colors.fill;
  ctx.strokeStyle = colors.stroke;
  ctx.lineWidth = 1;
  ctx.fillRect(32, rect.height - 86, 215, 54);
  ctx.strokeRect(32, rect.height - 86, 215, 54);
  ctx.fillStyle = colors.text;
  ctx.font = "700 11px Inter, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("INTERNAL LENS CHANNEL", 44, rect.height - 62);
  ctx.fillStyle = colors.muted;
  ctx.font = "500 11px Inter, Arial, sans-serif";
  ctx.fillText(`${formatNumber(construction.lensSeatWidth)} mm slot / ${formatNumber(construction.lensSeatDepth)} mm capture / ${formatNumber(construction.lensClearance)} mm fit`, 44, rect.height - 44);
}

function updateDesignCamera() {
  if (!designCamera) return;
  designCamera.position.set(designCameraTarget.x, designCameraTarget.y + designCameraDistance * 0.26, designCameraTarget.z + designCameraDistance);
  designCamera.lookAt(designCameraTarget);
  designCamera.zoom = 1 / designZoomScale;
  designCamera.near = Math.max(0.1, designCameraDistance / 100);
  designCamera.far = designCameraDistance * 9;
  designCamera.updateProjectionMatrix();
}

function fitDesignCamera() {
  if (!designModelGroup || !designCamera) return;
  const box = new THREE.Box3().setFromObject(designModelGroup);
  if (box.isEmpty()) return;
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  designCameraDistance = Math.max(92, sphere.radius * 2.12);
  designCameraTarget.set(0, 0, 0);
  updateDesignCamera();
}

function centerDesignModelForAssemblyPivot() {
  if (!designModelGroup) return;
  const currentRotation = designModelGroup.rotation.clone();
  designModelGroup.rotation.set(0, 0, 0);
  designModelGroup.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(designModelGroup);
  if (!box.isEmpty()) {
    const center = box.getCenter(new THREE.Vector3()).sub(designModelGroup.position);
    designModelGroup.children.forEach((child) => child.position.sub(center));
  }
  designModelGroup.rotation.copy(currentRotation);
  designModelGroup.updateMatrixWorld(true);
}

function designPreviewMaterial(MaterialType, options = {}, opacity = 1) {
  const normalizedOpacity = normalizeDesignOpacity(opacity, 1);
  const transparent = normalizedOpacity < 0.995;
  return new MaterialType({
    ...options,
    transparent,
    opacity: normalizedOpacity,
    depthWrite: !transparent
  });
}

function renderDesignPreview(options = {}) {
  if (!designModelGroup) return;
  const { fitView = false } = options;
  const p = designGeometryParams();
  const definition = designDefinitionFromDraft();
  const style = normalizeDesignStyle(definition);
  designModelGroup.clear();
  designModelGroup.rotation.set(designViewerRotation.x, designViewerRotation.y, designViewerRotation.z);
  const frontMaterial = designPreviewMaterial(THREE.MeshStandardMaterial, { color: style.frameColor, roughness: 0.37, metalness: 0.035 }, style.frameOpacity);
  const templeMaterial = designPreviewMaterial(THREE.MeshStandardMaterial, { color: style.templeColor, roughness: 0.37, metalness: 0.035 }, style.templeOpacity);
  const detailMaterial = new THREE.MeshStandardMaterial({ color: style.detailColor, roughness: 0.42, metalness: 0.02 });
  const lensMaterial = designPreviewMaterial(THREE.MeshPhysicalMaterial, {
    color: style.lensColor,
    roughness: 0.16,
    metalness: 0.04,
    transmission: style.lensOpacity < 0.995 ? 0.24 : 0
  }, style.lensOpacity);
  const outerLensWidth = p.lens_width + p.rim_thickness * 2;
  const center = p.bridge_width / 2 + outerLensWidth / 2;
  addDesignFrontBody(p, frontMaterial, definition);
  addDesignTopVisor(p, frontMaterial, definition);
  addDesignNoseWings(p, frontMaterial, definition, designModelGroup);
  [-1, 1].forEach((side) => {
    addDesignLens(side * center, p, lensMaterial, definition);
    addDesignTemple(side, p, outerLensWidth, templeMaterial, detailMaterial, style, definition);
    addDesignHingeAsset(
      side < 0 ? "frontRight" : "frontLeft",
      designHingeDatum(side, p, definition),
      frontMaterial
    );
  });
  centerDesignModelForAssemblyPivot();
  if (fitView) {
    designZoomScale = 1;
    fitDesignCamera();
  }
  if (els.designDimensions) {
    els.designDimensions.textContent = `${formatNumber(p.head_width)} mm frame / ${formatNumber(p.bridge_width)} mm bridge / ${formatNumber(p.temple_length)} mm temple`;
  }
  renderDesignFitWarnings();
  updateDesignHistoryControls();
  updateDesignMeasureUi();
  drawDesignSketch();
}

function designCornerRadius(p, style, outer = false) {
  if (style.lensShape === "round") return Math.min(p.lens_height / 2, p.lens_width / 2) + (outer ? p.rim_thickness : 0);
  if (style.lensShape === "sharp") return Math.max(2, p.corner_radius * 0.44 + (outer ? p.rim_thickness * 0.35 : 0));
  return p.corner_radius + (outer ? p.rim_thickness * 0.9 : 0);
}

function polygonSignedArea(points) {
  return points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length];
    return area + point.x * next.y - next.x * point.y;
  }, 0) / 2;
}

function offsetDesignPolygon(points, distance) {
  if (!distance) return points.map((point) => ({ ...point }));
  const clockwise = polygonSignedArea(points) < 0;
  const offsetNormal = (start, end) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy) || 1;
    return clockwise
      ? { x: -dy / length * distance, y: dx / length * distance }
      : { x: dy / length * distance, y: -dx / length * distance };
  };
  return points.map((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const previousNormal = offsetNormal(previous, point);
    const nextNormal = offsetNormal(point, next);
    const lineA = { x: previous.x + previousNormal.x, y: previous.y + previousNormal.y };
    const directionA = { x: point.x - previous.x, y: point.y - previous.y };
    const lineB = { x: point.x + nextNormal.x, y: point.y + nextNormal.y };
    const directionB = { x: next.x - point.x, y: next.y - point.y };
    const cross = directionA.x * directionB.y - directionA.y * directionB.x;
    if (Math.abs(cross) < 0.00001) {
      return {
        x: point.x + (previousNormal.x + nextNormal.x) / 2,
        y: point.y + (previousNormal.y + nextNormal.y) / 2
      };
    }
    const t = ((lineB.x - lineA.x) * directionB.y - (lineB.y - lineA.y) * directionB.x) / cross;
    return {
      x: lineA.x + directionA.x * t,
      y: lineA.y + directionA.y * t
    };
  });
}

function designProfileOutline(width, height, definition, expansion = 0) {
  const sketch = normalizeDesignSketch(definition?.sketch);
  const distance = Math.max(0, parseDesignNumber(expansion, 0));
  const points = offsetDesignPolygon(
    sketch.points.map(([x, y]) => ({ x: x * width, y: y * height })),
    distance
  );
  return {
    points,
    radii: sketch.cornerRadii.map((radius) => Math.max(0, radius + distance))
  };
}

function roundedPolygonCorners(points, radii = 0) {
  return points.map((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const previousLength = Math.hypot(previous.x - point.x, previous.y - point.y);
    const nextLength = Math.hypot(next.x - point.x, next.y - point.y);
    const radius = Array.isArray(radii)
      ? parseDesignNumber(radii[index], 0)
      : parseDesignNumber(radii, 0);
    const safeRadius = Math.max(0, radius);
    const previousDirection = {
      x: (previous.x - point.x) / Math.max(previousLength, 0.001),
      y: (previous.y - point.y) / Math.max(previousLength, 0.001)
    };
    const nextDirection = {
      x: (next.x - point.x) / Math.max(nextLength, 0.001),
      y: (next.y - point.y) / Math.max(nextLength, 0.001)
    };
    const dot = THREE.MathUtils.clamp(
      previousDirection.x * nextDirection.x + previousDirection.y * nextDirection.y,
      -1,
      1
    );
    const angle = Math.acos(dot);
    const maxDistance = Math.min(previousLength, nextLength) * 0.48;
    const circularDistance = safeRadius / Math.max(Math.tan(angle / 2), 0.001);
    const visibleDistance = safeRadius;
    const distance = safeRadius > 0 && previousLength > 0.001 && nextLength > 0.001
      ? Math.min(Math.max(circularDistance, visibleDistance), maxDistance)
      : 0;
    return {
      point,
      start: {
        x: point.x + previousDirection.x * distance,
        y: point.y + previousDirection.y * distance
      },
      end: {
        x: point.x + nextDirection.x * distance,
        y: point.y + nextDirection.y * distance
      }
    };
  });
}

function cleanRoundedPolygonInput(points, radii = 0) {
  const cleanedPoints = [];
  const cleanedRadii = [];
  points.forEach((point, index) => {
    const radius = Array.isArray(radii)
      ? parseDesignNumber(radii[index], 0)
      : parseDesignNumber(radii, 0);
    const previous = cleanedPoints[cleanedPoints.length - 1];
    if (previous && Math.hypot(previous.x - point.x, previous.y - point.y) < 0.001) {
      cleanedRadii[cleanedRadii.length - 1] = Math.max(cleanedRadii[cleanedRadii.length - 1] || 0, radius);
      return;
    }
    cleanedPoints.push(point);
    cleanedRadii.push(radius);
  });
  if (cleanedPoints.length > 2) {
    const first = cleanedPoints[0];
    const last = cleanedPoints[cleanedPoints.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) < 0.001) {
      cleanedPoints.pop();
      cleanedRadii[0] = Math.max(cleanedRadii[0] || 0, cleanedRadii.pop() || 0);
    }
  }
  return { points: cleanedPoints, radii: cleanedRadii };
}

function traceRoundedPolygon(path, points, radii = 0) {
  const clean = cleanRoundedPolygonInput(points, radii);
  const corners = roundedPolygonCorners(clean.points, clean.radii);
  if (!corners.length) return;
  path.moveTo(corners[0].start.x, corners[0].start.y);
  corners.forEach((corner, index) => {
    path.quadraticCurveTo(corner.point.x, corner.point.y, corner.end.x, corner.end.y);
    const next = corners[(index + 1) % corners.length];
    path.lineTo(next.start.x, next.start.y);
  });
  path.closePath();
}

function sampledRoundedPolygon(points, radii = 0, segmentCount = 16) {
  const clean = cleanRoundedPolygonInput(points, radii);
  const corners = roundedPolygonCorners(clean.points, clean.radii);
  const samples = [];
  if (!corners.length) return samples;
  corners.forEach((corner, index) => {
    if (!index) samples.push([corner.start.x, corner.start.y]);
    for (let step = 1; step <= segmentCount; step += 1) {
      const t = step / segmentCount;
      const inverse = 1 - t;
      samples.push([
        inverse * inverse * corner.start.x + 2 * inverse * t * corner.point.x + t * t * corner.end.x,
        inverse * inverse * corner.start.y + 2 * inverse * t * corner.point.y + t * t * corner.end.y
      ]);
    }
    const next = corners[(index + 1) % corners.length];
    samples.push([next.start.x, next.start.y]);
  });
  return samples;
}

function designRingArea(ring) {
  return ring.reduce((area, point, index) => {
    const next = ring[(index + 1) % ring.length];
    return area + point[0] * next[1] - next[0] * point[1];
  }, 0) / 2;
}

function designCleanRing(ring) {
  const cleaned = [];
  ring.forEach((point) => {
    const x = Number(point?.[0]);
    const y = Number(point?.[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const rounded = [Number(x.toFixed(4)), Number(y.toFixed(4))];
    const previous = cleaned[cleaned.length - 1];
    if (previous && Math.hypot(previous[0] - rounded[0], previous[1] - rounded[1]) < 0.001) return;
    cleaned.push(rounded);
  });
  if (cleaned.length > 2) {
    const first = cleaned[0];
    const last = cleaned[cleaned.length - 1];
    if (Math.hypot(first[0] - last[0], first[1] - last[1]) < 0.001) cleaned.pop();
  }
  return cleaned;
}

function designCircleRing(cx, cy, radius, segments = 14) {
  return Array.from({ length: segments }, (_, index) => {
    const angle = (Math.PI * 2 * index) / segments;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  });
}

function designSegmentCapsuleRing(start, end, radius, arcSegments = 7) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy);
  if (length < 0.001) return designCircleRing(start[0], start[1], radius, arcSegments * 2);
  const normalAngle = Math.atan2(dx / length, -dy / length);
  const points = [
    [start[0] + Math.cos(normalAngle) * radius, start[1] + Math.sin(normalAngle) * radius],
    [end[0] + Math.cos(normalAngle) * radius, end[1] + Math.sin(normalAngle) * radius]
  ];
  for (let step = 1; step <= arcSegments; step += 1) {
    const angle = normalAngle - (Math.PI * step) / arcSegments;
    points.push([end[0] + Math.cos(angle) * radius, end[1] + Math.sin(angle) * radius]);
  }
  points.push([
    start[0] + Math.cos(normalAngle - Math.PI) * radius,
    start[1] + Math.sin(normalAngle - Math.PI) * radius
  ]);
  for (let step = 1; step <= arcSegments; step += 1) {
    const angle = normalAngle - Math.PI - (Math.PI * step) / arcSegments;
    points.push([start[0] + Math.cos(angle) * radius, start[1] + Math.sin(angle) * radius]);
  }
  return designCleanRing(points);
}

function designFallbackOffsetRing(ring, distance) {
  const offset = offsetDesignPolygon(ring.map(([x, y]) => ({ x, y })), distance);
  return designCleanRing(offset.map(({ x, y }) => [x, y]));
}

function designBufferedRing(ring, distance) {
  const radius = Math.max(0, parseDesignNumber(distance, 0));
  const base = designCleanRing(ring);
  if (base.length < 3 || radius < 0.001) return base;
  try {
    const geometries = [[base]];
    base.forEach((point, index) => {
      const next = base[(index + 1) % base.length];
      const capsule = designSegmentCapsuleRing(point, next, radius);
      if (capsule.length >= 3) geometries.push([capsule]);
    });
    const union = polygonClipping.union(...geometries);
    const candidates = [];
    union.forEach((polygon) => {
      const outer = designCleanRing(polygon?.[0] || []);
      if (outer.length >= 3) candidates.push(outer);
    });
    if (!candidates.length) return designFallbackOffsetRing(base, radius);
    return candidates.reduce((best, candidate) => (
      Math.abs(designRingArea(candidate)) > Math.abs(designRingArea(best)) ? candidate : best
    ), candidates[0]);
  } catch {
    return designFallbackOffsetRing(base, radius);
  }
}

const designLocalOutlineRingCache = new Map();

function designLocalOutlineRing(p, definition, expansion = 0) {
  const sketch = normalizeDesignSketch(definition?.sketch);
  const distance = Math.max(0, parseDesignNumber(expansion, 0));
  const key = [
    p.lens_width.toFixed(3),
    p.lens_height.toFixed(3),
    distance.toFixed(3),
    sketch.points.map(([x, y]) => `${Number(x).toFixed(4)},${Number(y).toFixed(4)}`).join(";"),
    sketch.cornerRadii.map((radius) => Number(radius).toFixed(3)).join(";")
  ].join("|");
  const cached = designLocalOutlineRingCache.get(key);
  if (cached) return cached;
  const points = sketch.points.map(([x, y]) => ({ x: x * p.lens_width, y: y * p.lens_height }));
  const base = sampledRoundedPolygon(points, sketch.cornerRadii);
  const ring = designBufferedRing(base, distance);
  if (designLocalOutlineRingCache.size > 80) designLocalOutlineRingCache.clear();
  designLocalOutlineRingCache.set(key, ring);
  return ring;
}

function designLensCenter(p) {
  return p.bridge_width / 2 + (p.lens_width + p.rim_thickness * 2) / 2;
}

function designOutlineRing(centerX, p, definition, expansion, mirror = false) {
  return designLocalOutlineRing(p, definition, expansion).map(([x, y]) => [
    centerX + (mirror ? -x : x),
    y
  ]);
}

function designOuterRimRing(side, p, definition = state.designDraft) {
  const center = designLensCenter(p);
  return designOutlineRing(side * center, p, definition, p.rim_thickness, side < 0);
}

function designRingIntersectionsAtY(ring, y) {
  const intersections = [];
  ring.forEach(([x1, y1], index) => {
    const [x2, y2] = ring[(index + 1) % ring.length];
    if (Math.abs(y2 - y1) < 0.0001) {
      if (Math.abs(y - y1) < 0.25) intersections.push(x1, x2);
      return;
    }
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    if (y < minY - 0.0001 || y > maxY + 0.0001) return;
    const ratio = (y - y1) / (y2 - y1);
    if (ratio < -0.0001 || ratio > 1.0001) return;
    intersections.push(x1 + (x2 - x1) * ratio);
  });
  return intersections.filter(Number.isFinite);
}

function designRimBoundaryX(side, p, definition, y, towardBridge = false) {
  const ring = designOuterRimRing(side, p, definition);
  let xs = designRingIntersectionsAtY(ring, y);
  if (!xs.length) {
    const band = Math.max(1.2, p.rim_thickness * 0.75);
    xs = ring.filter(([, pointY]) => Math.abs(pointY - y) <= band).map(([x]) => x);
  }
  if (!xs.length) {
    const nearest = ring.reduce((best, point) => {
      const distance = Math.abs(point[1] - y);
      return distance < best.distance ? { distance, x: point[0] } : best;
    }, { distance: Infinity, x: NaN });
    if (Number.isFinite(nearest.x)) xs = [nearest.x];
  }
  if (!xs.length) return null;
  if (side > 0) return towardBridge ? Math.min(...xs) : Math.max(...xs);
  return towardBridge ? Math.max(...xs) : Math.min(...xs);
}

function designRimBoundaryNearX(side, p, definition, y, targetX) {
  const ring = designOuterRimRing(side, p, definition);
  let xs = designRingIntersectionsAtY(ring, y);
  if (!xs.length) {
    const band = Math.max(1.4, p.rim_thickness * 0.95);
    xs = ring
      .filter(([, pointY]) => Math.abs(pointY - y) <= band)
      .map(([x]) => x);
  }
  if (!xs.length) {
    const nearest = ring.reduce((best, [x, pointY]) => {
      const distance = Math.hypot((x - targetX) * 0.65, pointY - y);
      return distance < best.distance ? { distance, x } : best;
    }, { distance: Infinity, x: NaN });
    if (Number.isFinite(nearest.x)) xs = [nearest.x];
  }
  if (!xs.length) return null;
  return xs.reduce((best, x) => (
    Math.abs(x - targetX) < Math.abs(best - targetX) ? x : best
  ), xs[0]);
}

function designLensOpeningBoundaryX(side, p, definition, y, towardBridge = false) {
  const center = designLensCenter(p);
  const ring = designOutlineRing(side * center, p, definition, 0, side < 0);
  let xs = designRingIntersectionsAtY(ring, y);
  if (!xs.length) {
    const band = Math.max(1, p.rim_thickness * 0.55);
    xs = ring.filter(([, pointY]) => Math.abs(pointY - y) <= band).map(([x]) => x);
  }
  if (!xs.length) return null;
  if (side > 0) return towardBridge ? Math.min(...xs) : Math.max(...xs);
  return towardBridge ? Math.max(...xs) : Math.min(...xs);
}

function designRoundedRectRing(width, height, radius, centerX = 0, centerY = 0) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  return sampledRoundedPolygon([
    { x: centerX - halfWidth, y: centerY + halfHeight },
    { x: centerX + halfWidth, y: centerY + halfHeight },
    { x: centerX + halfWidth, y: centerY - halfHeight },
    { x: centerX - halfWidth, y: centerY - halfHeight }
  ], Math.min(Math.max(0, radius), halfWidth, halfHeight));
}

function designBridgeProfileRing(p, definition) {
  return designBridgeProfileOutline(p, definition).points.map(({ x, y }) => [x, y]);
}

function designBridgeLowerBlendRing(p, definition, side) {
  const bridge = designBridgeMetrics(p, definition);
  const construction = normalizeDesignConstruction(definition?.construction);
  const maxRadius = Math.max(0, Math.min(bridge.height * 0.98, p.rim_thickness * 2.2, 8));
  const radius = THREE.MathUtils.clamp(
    parseDesignNumber(construction.bridgeBlendRadius, defaultDesignConstruction.bridgeBlendRadius),
    0,
    maxRadius
  );
  if (radius <= 0.01) return [];
  const cornerX = side * bridge.bottomHalfWidth;
  const cornerY = bridge.bottomJoinY;
  const tangentX = cornerX - side * radius;
  const tangentY = cornerY - radius;
  const arcCenterX = tangentX;
  const arcCenterY = tangentY;
  const segments = 12;
  const startAngle = Math.PI / 2;
  const endAngle = side > 0 ? 0 : Math.PI;
  const points = [
    [cornerX, cornerY],
    [tangentX, cornerY]
  ];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const angle = startAngle + (endAngle - startAngle) * t;
    points.push([
      arcCenterX + Math.cos(angle) * radius,
      arcCenterY + Math.sin(angle) * radius
    ]);
  }
  return designCleanRing(points);
}

function designBridgeLowerBlendRings(p, definition) {
  return [-1, 1]
    .map((side) => designBridgeLowerBlendRing(p, definition, side))
    .filter((ring) => ring.length >= 3);
}

function designFrontPlanarPolygons(p, definition, innerExpansion = 0) {
  const center = designLensCenter(p);
  const leftRim = polygonClipping.difference(
    [designOutlineRing(-center, p, definition, p.rim_thickness, true)],
    [designOutlineRing(-center, p, definition, innerExpansion, true)]
  );
  const rightRim = polygonClipping.difference(
    [designOutlineRing(center, p, definition, p.rim_thickness)],
    [designOutlineRing(center, p, definition, innerExpansion)]
  );
  const solids = [
    ...leftRim,
    ...rightRim,
    [designBridgeProfileRing(p, definition)],
    ...designBridgeLowerBlendRings(p, definition).map((ring) => [ring]),
    [designHingePadConnectorRing(-1, p, definition)],
    [designHingePadConnectorRing(1, p, definition)]
  ];
  return polygonClipping.union(...solids);
}

function designLensSeatCutPolygons(p, definition) {
  const construction = normalizeDesignConstruction(definition?.construction);
  const seatDepth = THREE.MathUtils.clamp(construction.lensSeatDepth, 0, Math.max(0, p.rim_thickness - 0.05));
  if (seatDepth <= 0.001) return [];
  const center = designLensCenter(p);
  const cuts = [-1, 1].flatMap((side) => {
    const mirror = side < 0;
    const cx = side * center;
    try {
      return polygonClipping.difference(
        [designOutlineRing(cx, p, definition, seatDepth, mirror)],
        [designOutlineRing(cx, p, definition, 0, mirror)]
      );
    } catch {
      return [];
    }
  });
  return cuts.filter((polygon) => Array.isArray(polygon?.[0]) && polygon[0].length >= 3);
}

function designFrontLensChannelPolygons(p, definition) {
  const basePolygons = designFrontPlanarPolygons(p, definition, 0);
  const seatCuts = designLensSeatCutPolygons(p, definition);
  const fallback = () => designFrontPlanarPolygons(p, definition, normalizeDesignConstruction(definition?.construction).lensSeatDepth);
  if (!basePolygons.length || !seatCuts.length) return fallback();
  try {
    const channelPolygons = polygonClipping.difference(basePolygons, ...seatCuts);
    if (Array.isArray(channelPolygons) && channelPolygons.length) return channelPolygons;
  } catch {
    // Retry below one cut at a time; this is more tolerant of bridge/rim overlaps.
  }
  try {
    let channelPolygons = basePolygons;
    seatCuts.forEach((cut) => {
      channelPolygons = polygonClipping.difference(channelPolygons, cut);
    });
    if (Array.isArray(channelPolygons) && channelPolygons.length) return channelPolygons;
  } catch {
    return fallback();
  }
  return fallback();
}

function designFrontPlanarBounds(p, definition) {
  const polygons = designFrontPlanarPolygons(p, definition, 0);
  const points = polygons.flatMap((polygon) => polygon.flatMap((ring) => ring));
  if (!points.length) {
    return {
      minX: -p.head_width / 2,
      maxX: p.head_width / 2,
      minY: -p.lens_height / 2 - p.rim_thickness,
      maxY: p.lens_height / 2 + p.rim_thickness
    };
  }
  return points.reduce((bounds, [x, y]) => ({
    minX: Math.min(bounds.minX, x),
    maxX: Math.max(bounds.maxX, x),
    minY: Math.min(bounds.minY, y),
    maxY: Math.max(bounds.maxY, y)
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
}

function designTopVisorControls(p, definition = state.designDraft) {
  const construction = normalizeDesignConstruction(definition?.construction);
  const bounds = designFrontPlanarBounds(p, definition);
  const authoredSide = 1;
  const rimPoints = designOuterRimRing(authoredSide, p, definition);
  const rimBounds = rimPoints.reduce((next, [x, y]) => ({
    minX: Math.min(next.minX, x),
    maxX: Math.max(next.maxX, x),
    minY: Math.min(next.minY, y),
    maxY: Math.max(next.maxY, y)
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  const hasRimBounds = Number.isFinite(rimBounds.minX)
    && Number.isFinite(rimBounds.maxX)
    && Number.isFinite(rimBounds.minY)
    && Number.isFinite(rimBounds.maxY);
  const selectionBounds = hasRimBounds ? rimBounds : bounds;
  const margin = Math.max(1.2, p.rim_thickness * 0.32);
  const minGap = Math.max(6, p.rim_thickness * 1.8);
  const minX = selectionBounds.minX + margin;
  const maxX = selectionBounds.maxX - margin;
  const usableStart = Math.min(minX, maxX - minGap);
  const usableEnd = Math.max(maxX, usableStart + minGap);
  const defaultStart = usableStart;
  const defaultEnd = usableEnd;
  const rawStart = parseDesignNumber(construction.topVisorStartX, defaultStart);
  const rawEnd = parseDesignNumber(construction.topVisorEndX, defaultEnd);
  const sortedStart = Math.min(rawStart, rawEnd - minGap);
  let startX = THREE.MathUtils.clamp(sortedStart, usableStart, usableEnd - minGap);
  let endX = THREE.MathUtils.clamp(Math.max(rawEnd, startX + minGap), startX + minGap, usableEnd);
  if (endX - startX < minGap) {
    startX = Math.max(usableStart, endX - minGap);
    endX = Math.min(usableEnd, startX + minGap);
  }
  const maximumBandHeight = Math.max(2, Math.min(12, selectionBounds.maxY - bounds.minY));
  const bandHeight = THREE.MathUtils.clamp(construction.topVisorBandHeight, 2, maximumBandHeight);
  const topY = selectionBounds.maxY + 0.12;
  const bottomY = topY - bandHeight;
  const radius = THREE.MathUtils.clamp(
    construction.topVisorRadius,
    0,
    Math.min(2.5, bandHeight * 0.45, Math.max(0, (endX - startX) / 2 - 0.01))
  );
  return {
    enabled: construction.topVisorEnabled,
    depth: construction.topVisorDepth,
    bandHeight,
    radius,
    startX,
    endX,
    minX: usableStart,
    maxX: usableEnd,
    minGap,
    topY,
    bottomY,
    handleY: bottomY + bandHeight * 0.5,
    segments: [
      { side: -1, startX: -endX, endX: -startX },
      { side: 1, startX, endX }
    ]
  };
}

function designTopVisorPlanarPolygons(p, definition = state.designDraft) {
  const controls = designTopVisorControls(p, definition);
  if (!controls.enabled || controls.depth <= 0.02) return [];
  const height = Math.max(0.1, controls.topY - controls.bottomY);
  return controls.segments.flatMap((segment) => {
    const width = Math.max(0.1, segment.endX - segment.startX);
    const rectangle = designRoundedRectRing(
      width,
      height,
      Math.min(controls.radius, width / 2 - 0.01, height / 2 - 0.01),
      (segment.startX + segment.endX) / 2,
      (controls.topY + controls.bottomY) / 2
    );
    try {
      const center = designLensCenter(p);
      const rim = polygonClipping.difference(
        [designOutlineRing(segment.side * center, p, definition, p.rim_thickness, segment.side < 0)],
        [designOutlineRing(segment.side * center, p, definition, 0, segment.side < 0)]
      );
      return polygonClipping.intersection(rim, [[rectangle]]);
    } catch {
      return [];
    }
  });
}

function ringPath(ring, path = new THREE.Shape()) {
  path.moveTo(ring[0][0], ring[0][1]);
  ring.slice(1).forEach(([x, y]) => path.lineTo(x, y));
  path.closePath();
  return path;
}

function designFrontShapes(p, definition, innerExpansion = 0) {
  return designFrontPlanarPolygons(p, definition, innerExpansion).map((polygon) => {
    const shape = ringPath(polygon[0]);
    polygon.slice(1).forEach((ring) => shape.holes.push(ringPath(ring, new THREE.Path())));
    return shape;
  });
}

function designShapesFromPolygons(polygons) {
  return (Array.isArray(polygons) ? polygons : [])
    .filter((polygon) => Array.isArray(polygon?.[0]) && polygon[0].length >= 3)
    .map((polygon) => {
      const shape = ringPath(designCleanRing(polygon[0]));
      polygon.slice(1).forEach((ring) => {
        const hole = designCleanRing(ring);
        if (hole.length >= 3) shape.holes.push(ringPath(hole, new THREE.Path()));
      });
      return shape;
    });
}

function designNoseWingSpan(p) {
  return THREE.MathUtils.clamp(p.lens_height * 0.27, 7, 12);
}

function designNoseWingControls(p, definition = state.designDraft) {
  const construction = normalizeDesignConstruction(definition?.construction);
  const bridge = designBridgeMetrics(p, definition);
  const span = designNoseWingSpan(p);
  const minGap = Math.max(2.2, p.rim_thickness * 0.72);
  const topOuterOffset = THREE.MathUtils.clamp(construction.noseWingTopOuterOffset, -34 + minGap, 8);
  const bottomOuterOffset = THREE.MathUtils.clamp(construction.noseWingBottomOuterOffset, -34, topOuterOffset - minGap);
  const topInnerOffset = THREE.MathUtils.clamp(construction.noseWingTopInnerOffset, -34 + minGap, 8);
  const bottomInnerOffset = THREE.MathUtils.clamp(construction.noseWingBottomInnerOffset, -34, topInnerOffset - minGap);
  const topOffset = (topOuterOffset + topInnerOffset) / 2;
  const bottomOffset = (bottomOuterOffset + bottomInnerOffset) / 2;
  return {
    bridge,
    minGap,
    topOffset,
    bottomOffset,
    topY: bridge.bottomJoinY + topOffset,
    bottomY: bridge.bottomJoinY + bottomOffset,
    topOuterOffset,
    topInnerOffset,
    bottomInnerOffset,
    bottomOuterOffset,
    topOuterY: bridge.bottomJoinY + topOuterOffset,
    topInnerY: bridge.bottomJoinY + topInnerOffset,
    bottomInnerY: bridge.bottomJoinY + bottomInnerOffset,
    bottomOuterY: bridge.bottomJoinY + bottomOuterOffset,
    topShift: 0,
    bottomShift: 0,
    span: Math.max(minGap, topOffset - bottomOffset || span)
  };
}

function designNoseWingBoundaryPair(p, definition, side, y) {
  const center = designLensCenter(p);
  const fallbackInner = side * (center - p.lens_width / 2);
  const fallbackOuter = fallbackInner - side * p.rim_thickness * 1.15;
  let outerX = designRimBoundaryX(side, p, definition, y, true);
  let innerX = designLensOpeningBoundaryX(side, p, definition, y, true);
  if (!Number.isFinite(outerX) || !Number.isFinite(innerX) || Math.abs(innerX - outerX) < 0.8) {
    outerX = fallbackOuter;
    innerX = fallbackInner;
  }
  return { outerX, innerX };
}

function designNoseWingCornerPoint(p, definition, side, edge, y) {
  const boundary = designNoseWingBoundaryPair(p, definition, side, y);
  return [edge === "outer" ? boundary.outerX : boundary.innerX, y];
}

function designNoseWingCornerPoints(p, definition, side) {
  const construction = normalizeDesignConstruction(definition?.construction);
  if (construction.noseWingHeight <= 0.02) return [];
  const controls = designNoseWingControls(p, definition);
  return [
    {
      point: designNoseWingCornerPoint(p, definition, side, "outer", controls.topOuterY),
      handleIndex: 0,
      edge: "outer",
      vertical: "top"
    },
    {
      point: designNoseWingCornerPoint(p, definition, side, "inner", controls.topInnerY),
      handleIndex: 1,
      edge: "inner",
      vertical: "top"
    },
    {
      point: designNoseWingCornerPoint(p, definition, side, "inner", controls.bottomInnerY),
      handleIndex: 2,
      edge: "inner",
      vertical: "bottom"
    },
    {
      point: designNoseWingCornerPoint(p, definition, side, "outer", controls.bottomOuterY),
      handleIndex: 3,
      edge: "outer",
      vertical: "bottom"
    }
  ];
}

function designNoseWingLineSegments(p, definition, side) {
  const corners = designNoseWingCornerPoints(p, definition, side);
  if (corners.length < 4) return [];
  return [
    { outer: corners[0].point, inner: corners[1].point },
    { outer: corners[3].point, inner: corners[2].point }
  ];
}

function designNoseWingRuledRows(p, definition, side) {
  const corners = designNoseWingCornerPoints(p, definition, side);
  if (corners.length < 4) return [];
  const [topOuter, topInner, bottomInner, bottomOuter] = corners.map((corner) => corner.point);
  const span = Math.max(
    designPointDistance2D(topOuter, bottomOuter),
    designPointDistance2D(topInner, bottomInner),
    Math.abs(topOuter[1] - bottomOuter[1]),
    Math.abs(topInner[1] - bottomInner[1])
  );
  const rowCount = Math.max(4, Math.min(28, Math.ceil(span / 0.65)));
  const rows = [];
  for (let index = 0; index <= rowCount; index += 1) {
    const t = index / rowCount;
    const outerY = topOuter[1] + (bottomOuter[1] - topOuter[1]) * t;
    const innerY = topInner[1] + (bottomInner[1] - topInner[1]) * t;
    const outer = index === 0 ? topOuter : index === rowCount
      ? bottomOuter
      : designNoseWingCornerPoint(p, definition, side, "outer", outerY);
    const inner = index === 0 ? topInner : index === rowCount
      ? bottomInner
      : designNoseWingCornerPoint(p, definition, side, "inner", innerY);
    const width = side * (inner[0] - outer[0]);
    if (Number.isFinite(width) && width > 0.18) rows.push({ outer, inner });
  }
  return rows;
}

function designNoseWingFootprintRing(p, definition, side) {
  const rows = designNoseWingRuledRows(p, definition, side);
  if (rows.length < 2) return [];
  const fallback = designCleanRing([
    rows[0].outer,
    rows[0].inner,
    rows[rows.length - 1].inner,
    rows[rows.length - 1].outer
  ]);
  const ring = designCleanRing([
    ...rows.map((row) => row.outer),
    ...[...rows].reverse().map((row) => row.inner)
  ]);
  if (ring.length < 3 || designRingHasSelfIntersection(ring)) return fallback;
  return ring;
}

function designNoseWingFootprintPolygons(p, definition, side) {
  const ring = designNoseWingFootprintRing(p, definition, side);
  if (ring.length < 3) return [];
  return [[ring]];
}

function drawDesignNoseWingsSketch(ctx, metrics, style) {
  const { p, scale, centerX, centerY } = metrics;
  const construction = normalizeDesignConstruction(state.designDraft.construction);
  if (construction.noseWingHeight <= 0.02) return;
  const polygons = [-1, 1].flatMap((side) => designNoseWingFootprintPolygons(p, state.designDraft, side));
  const toCanvas = ([x, y]) => ({ x: centerX + x * scale, y: centerY - y * scale });
  const detailColor = normalizeDesignStyle(style).detailColor;
  if (polygons.length) {
    ctx.save();
    ctx.fillStyle = rgbaFromHex(detailColor, 0.48);
    ctx.strokeStyle = detailColor;
    ctx.lineWidth = Math.max(1.2, scale * 0.1);
    ctx.beginPath();
    polygons.forEach((polygon) => polygon.forEach((ring) => {
      const points = designCleanRing(ring).map(toCanvas);
      if (points.length < 3) return;
      ctx.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.closePath();
    }));
    ctx.fill("evenodd");
    ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.strokeStyle = detailColor;
  ctx.lineWidth = Math.max(2, scale * 0.16);
  ctx.lineCap = "round";
  [-1, 1].forEach((side) => {
    designNoseWingLineSegments(p, state.designDraft, side).forEach((line) => {
      const outer = toCanvas(line.outer);
      const inner = toCanvas(line.inner);
      ctx.beginPath();
      ctx.moveTo(outer.x, outer.y);
      ctx.lineTo(inner.x, inner.y);
      ctx.stroke();
    });
  });
  ctx.restore();
}

function drawDesignTopVisorSketch(ctx, metrics, style) {
  const { p, scale, centerX, centerY } = metrics;
  const controls = designTopVisorControls(p, state.designDraft);
  if (!controls.enabled || controls.depth <= 0.02) return;
  const polygons = designTopVisorPlanarPolygons(p, state.designDraft);
  const toCanvas = ([x, y]) => ({ x: centerX + x * scale, y: centerY - y * scale });
  const detailColor = normalizeDesignStyle(style).detailColor;
  ctx.save();
  ctx.fillStyle = rgbaFromHex(detailColor, 0.36);
  ctx.strokeStyle = detailColor;
  ctx.lineWidth = Math.max(1.4, scale * 0.11);
  ctx.beginPath();
  polygons.forEach((polygon) => polygon.forEach((ring) => {
    const points = designCleanRing(ring).map(toCanvas);
    if (points.length < 3) return;
    ctx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.closePath();
  }));
  ctx.fill("evenodd");
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = Math.max(1.6, scale * 0.13);
  controls.segments.forEach((segment) => {
    const guideStart = toCanvas([segment.startX, controls.handleY]);
    const guideEnd = toCanvas([segment.endX, controls.handleY]);
    ctx.beginPath();
    ctx.moveTo(guideStart.x, guideStart.y);
    ctx.lineTo(guideEnd.x, guideEnd.y);
    ctx.stroke();
  });
  ctx.setLineDash([6, 5]);
  ctx.lineWidth = 1.3;
  controls.segments.forEach((segment) => {
    [segment.startX, segment.endX].forEach((x) => {
      const top = toCanvas([x, controls.topY]);
      const bottom = toCanvas([x, controls.bottomY]);
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(bottom.x, bottom.y);
      ctx.stroke();
    });
  });
  ctx.restore();
}

function drawDesignFrontPlanarProfile(ctx, metrics, colors) {
  const { p, scale, centerX, centerY } = metrics;
  const polygons = designFrontPlanarPolygons(p, state.designDraft, 0);
  const toCanvas = ([x, y]) => ({ x: centerX + x * scale, y: centerY - y * scale });
  ctx.beginPath();
  polygons.forEach((polygon) => polygon.forEach((ring) => {
    const points = ring.map(toCanvas);
    ctx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.closePath();
  }));
  ctx.fillStyle = colors.fill;
  ctx.fill("evenodd");
  ctx.strokeStyle = colors.stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function designProfilePath(width, height, definition, expansion = 0, asHole = false, cornerRadius = 0) {
  if (!definition?.sketch?.points?.length) {
    return roundedRectShape(width + expansion * 2, height + expansion * 2, designCornerRadius(designGeometryParams(), definition, expansion > 0));
  }
  const outline = designProfileOutline(width, height, definition, expansion);
  const points = outline.points.map(({ x, y }) => new THREE.Vector2(x, y));
  const ordered = asHole ? [...points].reverse() : points;
  const orderedRadii = asHole ? [...outline.radii].reverse() : outline.radii;
  const path = asHole ? new THREE.Path() : new THREE.Shape();
  traceRoundedPolygon(path, ordered, orderedRadii);
  return path;
}

function designBridgeMetrics(p, definition = state.designDraft) {
  const construction = normalizeDesignConstruction(definition?.construction);
  const centerY = p.lens_height * 0.18;
  const height = THREE.MathUtils.clamp(
    parseDesignNumber(construction.bridgeThickness, defaultDesignConstruction.bridgeThickness),
    3,
    12
  );
  const clearHalfWidth = p.bridge_width / 2;
  const overlap = THREE.MathUtils.clamp(p.rim_thickness * 1.55, 3.4, p.rim_thickness * 2.15);
  const bondOverlap = THREE.MathUtils.clamp(p.rim_thickness * 0.06, 0.12, 0.24);
  const bridgeExteriorHalfWidthAtY = (y) => {
    const outerJoinX = designRimBoundaryX(1, p, definition, y, true);
    return Number.isFinite(outerJoinX)
      ? Math.max(clearHalfWidth, outerJoinX)
      : clearHalfWidth;
  };
  const rim = designOuterRimRing(1, p, definition);
  const rimMinY = Math.min(...rim.map(([, y]) => y));
  const rimMaxY = Math.max(...rim.map(([, y]) => y));
  const topLineY = THREE.MathUtils.clamp(
    centerY + parseDesignNumber(construction.bridgeTopJoinOffset, height / 2),
    rimMinY + 1.8,
    rimMaxY - 0.2
  );
  const bottomLineY = THREE.MathUtils.clamp(
    centerY + parseDesignNumber(construction.bridgeBottomJoinOffset, -height / 2 - p.rim_thickness * 0.8),
    rimMinY + 0.2,
    topLineY - 1.8
  );
  const topHalfWidth = bridgeExteriorHalfWidthAtY(topLineY) + bondOverlap;
  const bottomHalfWidth = bridgeExteriorHalfWidthAtY(bottomLineY) + bondOverlap;
  const halfWidth = Math.max(topHalfWidth, bottomHalfWidth);
  return {
    height: topLineY - bottomLineY,
    centerY,
    topY: topLineY,
    bottomY: bottomLineY,
    topJoinY: topLineY,
    bottomJoinY: bottomLineY,
    width: halfWidth * 2,
    halfWidth,
    topHalfWidth,
    bottomHalfWidth,
    clearHalfWidth,
    overlap,
    topRadius: 0,
    bottomRadius: 0,
    joinRadius: 0,
    cornerRadius: 0
  };
}

function designBridgeProfileOutline(p, definition = state.designDraft) {
  const bridge = designBridgeMetrics(p, definition);
  const points = [
    { x: -bridge.topHalfWidth, y: bridge.topJoinY },
    { x: 0, y: bridge.topY },
    { x: bridge.topHalfWidth, y: bridge.topJoinY },
    { x: bridge.bottomHalfWidth, y: bridge.bottomJoinY },
    { x: 0, y: bridge.bottomY },
    { x: -bridge.bottomHalfWidth, y: bridge.bottomJoinY }
  ];
  return {
    points,
    radii: points.map(() => 0)
  };
}

function designHingePadConnectorRing(side, p, definition = state.designDraft) {
  const center = designLensCenter(p);
  const pad = designHingePadOrigin(side, p, definition);
  const padHalf = designHingePadSize / 2;
  const padCenterY = pad.y + padHalf;
  const padInnerX = pad.x;
  const padOuterX = pad.x + side * designHingePadSize;
  const fallbackRimOuterX = side * (center + p.lens_width / 2 + p.rim_thickness * 0.88);
  const rimBoundary = designRimBoundaryNearX(side, p, definition, pad.y, padInnerX);
  let rimX = Number.isFinite(rimBoundary) ? rimBoundary : fallbackRimOuterX;
  if ((side > 0 && rimX > padInnerX) || (side < 0 && rimX < padInnerX)) {
    rimX = fallbackRimOuterX;
  }
  const rimOverlap = THREE.MathUtils.clamp(p.rim_thickness * 0.58, 1.8, 3.4);
  const maxReach = Math.max(p.rim_thickness * 1.65, designHingePadSize * 0.75);
  const maxReachX = padInnerX - side * maxReach;
  let rimJoinX = rimX - side * rimOverlap;
  rimJoinX = side > 0
    ? Math.max(rimJoinX, maxReachX)
    : Math.min(rimJoinX, maxReachX);
  const topY = pad.y + designHingePadSize;
  const bottomY = pad.y;
  const neckHalf = Math.min(padHalf * 0.68, Math.max(1.35, p.rim_thickness * 0.42));
  const radius = Math.min(0.42, padHalf * 0.16);
  return sampledRoundedPolygon([
    { x: padOuterX, y: topY },
    { x: padInnerX, y: topY },
    { x: rimJoinX, y: padCenterY + neckHalf },
    { x: rimJoinX, y: padCenterY - neckHalf },
    { x: padInnerX, y: bottomY },
    { x: padOuterX, y: bottomY }
  ], radius);
}

function designEdgeOperation(p, definition) {
  const features = normalizeDesignFeatures(definition?.features, p);
  if (features.chamfer.enabled) return { kind: "chamfer", amount: features.chamfer.amount, segments: 1 };
  if (features.fillet.enabled) return { kind: "fillet", amount: features.fillet.radius, segments: 3 };
  const fallbackRadius = THREE.MathUtils.clamp(parseDesignNumber(p.bevel, defaultParams.bevel) * 0.18 || 0.22, 0.14, 0.34);
  return { kind: "soft", amount: fallbackRadius, segments: 2 };
}

function designSafeFrontEdgeAmount(edge, p, construction, layerDepth) {
  const requested = Math.max(0, parseDesignNumber(edge?.amount, 0));
  if (!requested || !layerDepth) return 0;
  const depthLimit = Math.max(0, layerDepth * 0.42 - 0.02);
  const materialLimit = Math.max(0, p.rim_thickness * 0.32);
  const channelLimit = Math.max(0.08, construction.lensSeatDepth * 0.72);
  const absoluteLimit = edge?.kind === "chamfer" ? 0.9 : 0.55;
  return THREE.MathUtils.clamp(
    requested,
    0,
    Math.min(depthLimit, materialLimit, channelLimit, absoluteLimit)
  );
}

function containedBevelExtrudeOptions(depth, edgeAmount, bevelSegments = 1) {
  const safeDepth = Math.max(0.02, parseDesignNumber(depth, 0.02));
  const safeBevel = THREE.MathUtils.clamp(
    parseDesignNumber(edgeAmount, 0),
    0,
    Math.max(0, safeDepth / 2 - 0.01)
  );
  if (safeBevel <= 0.001) {
    return {
      options: { depth: safeDepth, bevelEnabled: false },
      centerOffset: safeDepth / 2
    };
  }
  const coreDepth = Math.max(0.02, safeDepth - safeBevel * 2);
  return {
    options: {
      depth: coreDepth,
      bevelEnabled: true,
      bevelThickness: safeBevel,
      bevelSize: safeBevel,
      bevelOffset: -safeBevel,
      bevelSegments: Math.max(1, Math.round(bevelSegments))
    },
    centerOffset: coreDepth / 2
  };
}

function designInterpolateRing(a, b, t) {
  return a.map((point, index) => [
    point[0] + (b[index][0] - point[0]) * t,
    point[1] + (b[index][1] - point[1]) * t
  ]);
}

function designPointDistance2D(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return Infinity;
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function designSegmentOrientation(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function designPointOnSegment(a, b, point) {
  const epsilon = 0.0001;
  return Math.abs(designSegmentOrientation(a, b, point)) <= epsilon
    && point[0] >= Math.min(a[0], b[0]) - epsilon
    && point[0] <= Math.max(a[0], b[0]) + epsilon
    && point[1] >= Math.min(a[1], b[1]) - epsilon
    && point[1] <= Math.max(a[1], b[1]) + epsilon;
}

function designSegmentsIntersect2D(a, b, c, d) {
  const epsilon = 0.0001;
  const o1 = designSegmentOrientation(a, b, c);
  const o2 = designSegmentOrientation(a, b, d);
  const o3 = designSegmentOrientation(c, d, a);
  const o4 = designSegmentOrientation(c, d, b);
  if (Math.abs(o1) <= epsilon && designPointOnSegment(a, b, c)) return true;
  if (Math.abs(o2) <= epsilon && designPointOnSegment(a, b, d)) return true;
  if (Math.abs(o3) <= epsilon && designPointOnSegment(c, d, a)) return true;
  if (Math.abs(o4) <= epsilon && designPointOnSegment(c, d, b)) return true;
  return (o1 > epsilon) !== (o2 > epsilon) && (o3 > epsilon) !== (o4 > epsilon);
}

function designRingHasSelfIntersection(ring) {
  const cleanRing = designCleanRing(ring);
  if (cleanRing.length < 4) return false;
  for (let index = 0; index < cleanRing.length; index += 1) {
    const next = (index + 1) % cleanRing.length;
    for (let other = index + 1; other < cleanRing.length; other += 1) {
      const otherNext = (other + 1) % cleanRing.length;
      const adjacent = index === other
        || next === other
        || otherNext === index;
      if (adjacent) continue;
      if (designSegmentsIntersect2D(cleanRing[index], cleanRing[next], cleanRing[other], cleanRing[otherNext])) {
        return true;
      }
    }
  }
  return false;
}

function designSmoothStep(value) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function designNoseWingRowDistance(row, previousRow) {
  if (!row || !previousRow) return 0;
  return (
    designPointDistance2D(row.outer, previousRow.outer)
    + designPointDistance2D(row.inner, previousRow.inner)
  ) / 2;
}

function designNoseWingRowDistances(rows) {
  const distances = rows.map(() => 0);
  for (let index = 1; index < rows.length; index += 1) {
    distances[index] = distances[index - 1] + designNoseWingRowDistance(rows[index], rows[index - 1]);
  }
  return distances;
}

function designNoseWingGeometryFromRows(rows, options) {
  const cleanRows = (Array.isArray(rows) ? rows : [])
    .filter((row) => Array.isArray(row?.outer) && Array.isArray(row?.inner))
    .map((row) => ({ outer: [...row.outer], inner: [...row.inner] }))
    .filter((row) => designPointDistance2D(row.outer, row.inner) > 0.18);
  if (cleanRows.length < 2) return null;

  const depth = Math.max(0.02, parseDesignNumber(options?.depth, 0.02));
  const topZ = parseDesignNumber(options?.topZ, 0);
  const angle = THREE.MathUtils.clamp(parseDesignNumber(options?.angle, 0), -35, 35);
  const side = options?.side < 0 ? -1 : 1;
  const tiltX = side * Math.tan(THREE.MathUtils.degToRad(angle)) * depth;
  const includeMountFace = options?.includeMountFace !== false;
  const shoulderDepth = Math.min(depth * 0.52, 1.25);
  const distances = designNoseWingRowDistances(cleanRows);
  const totalLength = Math.max(0.001, distances[distances.length - 1]);
  const columns = 24;
  const vertices = [];
  const indices = [];
  const stride = columns + 1;
  const surfaceVertex = (rowIndex, colIndex) => rowIndex * stride + colIndex;
  const baseStart = cleanRows.length * stride;
  const baseVertex = (rowIndex, colIndex) => baseStart + rowIndex * stride + colIndex;
  const cloneVertex = (index) => {
    const source = index * 3;
    const clone = vertices.length / 3;
    vertices.push(vertices[source], vertices[source + 1], vertices[source + 2]);
    return clone;
  };
  const triangleAreaSquared = (a, b, c) => {
    const ax = vertices[a * 3];
    const ay = vertices[a * 3 + 1];
    const az = vertices[a * 3 + 2];
    const bx = vertices[b * 3];
    const by = vertices[b * 3 + 1];
    const bz = vertices[b * 3 + 2];
    const cx = vertices[c * 3];
    const cy = vertices[c * 3 + 1];
    const cz = vertices[c * 3 + 2];
    const abx = bx - ax;
    const aby = by - ay;
    const abz = bz - az;
    const acx = cx - ax;
    const acy = cy - ay;
    const acz = cz - az;
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    return nx * nx + ny * ny + nz * nz;
  };
  const addFace = (a, b, c) => {
    if (triangleAreaSquared(a, b, c) <= 1e-10) return;
    if (side < 0) {
      indices.push(a, c, b);
    } else {
      indices.push(a, b, c);
    }
  };

  cleanRows.forEach((row, rowIndex) => {
    const lengthT = distances[rowIndex] / totalLength;
    const lengthU = 2 * lengthT - 1;
    const roundedRise = Math.sqrt(Math.max(0, 1 - lengthU * lengthU));
    const protrusion = Math.min(depth, shoulderDepth + Math.max(0, depth - shoulderDepth) * roundedRise);
    const shiftX = tiltX * (protrusion / depth);
    for (let colIndex = 0; colIndex <= columns; colIndex += 1) {
      const t = colIndex / columns;
      const x = row.outer[0] + (row.inner[0] - row.outer[0]) * t;
      const y = row.outer[1] + (row.inner[1] - row.outer[1]) * t;
      vertices.push(x + shiftX, y, topZ - protrusion);
    }
  });

  cleanRows.forEach((row) => {
    for (let colIndex = 0; colIndex <= columns; colIndex += 1) {
      const t = colIndex / columns;
      const x = row.outer[0] + (row.inner[0] - row.outer[0]) * t;
      const y = row.outer[1] + (row.inner[1] - row.outer[1]) * t;
      vertices.push(x, y, topZ);
    }
  });

  for (let rowIndex = 0; rowIndex < cleanRows.length - 1; rowIndex += 1) {
    for (let colIndex = 0; colIndex < columns; colIndex += 1) {
      const a = surfaceVertex(rowIndex, colIndex);
      const b = surfaceVertex(rowIndex, colIndex + 1);
      const c = surfaceVertex(rowIndex + 1, colIndex + 1);
      const d = surfaceVertex(rowIndex + 1, colIndex);
      addFace(a, b, c);
      addFace(a, c, d);
    }
  }

  if (includeMountFace) {
    for (let rowIndex = 0; rowIndex < cleanRows.length - 1; rowIndex += 1) {
      for (let colIndex = 0; colIndex < columns; colIndex += 1) {
        const a = baseVertex(rowIndex, colIndex);
        const b = baseVertex(rowIndex + 1, colIndex);
        const c = baseVertex(rowIndex + 1, colIndex + 1);
        const d = baseVertex(rowIndex, colIndex + 1);
        addFace(a, c, b);
        addFace(a, d, c);
      }
    }
  }

  const closeColumn = (colIndex) => {
    for (let rowIndex = 0; rowIndex < cleanRows.length - 1; rowIndex += 1) {
      const surfaceA = cloneVertex(surfaceVertex(rowIndex, colIndex));
      const surfaceB = cloneVertex(surfaceVertex(rowIndex + 1, colIndex));
      const baseA = cloneVertex(baseVertex(rowIndex, colIndex));
      const baseB = cloneVertex(baseVertex(rowIndex + 1, colIndex));
      addFace(baseA, surfaceB, surfaceA);
      addFace(baseA, baseB, surfaceB);
    }
  };
  const closeRow = (rowIndex, reverse = false) => {
    for (let colIndex = 0; colIndex < columns; colIndex += 1) {
      const surfaceA = cloneVertex(surfaceVertex(rowIndex, colIndex));
      const surfaceB = cloneVertex(surfaceVertex(rowIndex, colIndex + 1));
      const baseA = cloneVertex(baseVertex(rowIndex, colIndex));
      const baseB = cloneVertex(baseVertex(rowIndex, colIndex + 1));
      if (reverse) {
        addFace(baseA, surfaceB, baseB);
        addFace(baseA, surfaceA, surfaceB);
      } else {
        addFace(baseA, baseB, surfaceB);
        addFace(baseA, surfaceB, surfaceA);
      }
    }
  };
  closeColumn(0);
  closeColumn(columns);
  closeRow(0, false);
  closeRow(cleanRows.length - 1, true);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function addDesignFrontBody(p, material, definition, target = designModelGroup) {
  const features = normalizeDesignFeatures(definition?.features, p);
  const construction = normalizeDesignConstruction(definition?.construction);
  const edge = designEdgeOperation(p, definition);
  const addPolygonLayer = (polygons, depth, z, edgeEnabled) => {
    designShapesFromPolygons(polygons).forEach((shape) => {
      const edgeAmount = edgeEnabled ? designSafeFrontEdgeAmount(edge, p, construction, depth) : 0;
      const extrusion = containedBevelExtrudeOptions(depth, edgeAmount, edge.segments);
      const geometry = new THREE.ExtrudeGeometry(shape, extrusion.options);
      geometry.translate(0, 0, -extrusion.centerOffset);
      const layer = new THREE.Mesh(geometry, material);
      layer.position.z = z;
      target.add(layer);
    });
  };
  const addLayer = (innerExpansion, depth, z, edgeEnabled) => {
    addPolygonLayer(designFrontPlanarPolygons(p, definition, innerExpansion), depth, z, edgeEnabled);
  };
  if (features.lensRecess.enabled) {
    const depth = features.extrude.depth;
    const slotWidth = Math.min(construction.lensSeatWidth, depth - 0.9);
    const maximumOffset = Math.max(0, (depth - slotWidth) / 2 - 0.45);
    const slotOffset = THREE.MathUtils.clamp(construction.lensChannelOffset, -maximumOffset, maximumOffset);
    const rearLip = (depth - slotWidth) / 2 + slotOffset;
    const frontLip = (depth - slotWidth) / 2 - slotOffset;
    if (rearLip > 0) addLayer(0, rearLip, -depth / 2 + rearLip / 2, true);
    addPolygonLayer(designFrontLensChannelPolygons(p, definition), slotWidth, slotOffset, false);
    if (frontLip > 0) addLayer(0, frontLip, depth / 2 - frontLip / 2, true);
  } else {
    addLayer(0, features.extrude.depth, 0, true);
  }
}

function addDesignNoseWings(p, material, definition, target = designModelGroup, options = {}) {
  const construction = normalizeDesignConstruction(definition?.construction);
  const depth = construction.noseWingHeight;
  if (depth <= 0.02) return;
  const features = normalizeDesignFeatures(definition?.features, p);
  const overlap = designNoseWingRearOverlap(depth);
  const rearFaceZ = -features.extrude.depth / 2;
  const defaultTopZ = rearFaceZ + overlap;
  const topZ = Number.isFinite(options?.topZ) ? options.topZ : defaultTopZ;
  const wingMaterial = material?.clone ? material.clone() : material;
  if (wingMaterial) {
    wingMaterial.side = THREE.DoubleSide;
    wingMaterial.needsUpdate = true;
  }
  [-1, 1].forEach((side) => {
    const rows = designNoseWingRuledRows(p, definition, side);
    const geometry = designNoseWingGeometryFromRows(rows, {
      depth,
      topZ,
      angle: construction.noseWingAngle,
      side,
      includeMountFace: options.includeMountFace
    });
    if (!geometry) return;
    const wing = new THREE.Mesh(geometry, wingMaterial || material);
    wing.name = `nose-wing-${side < 0 ? "left" : "right"}`;
    target.add(wing);
  });
}

function addDesignTopVisor(p, material, definition, target = designModelGroup) {
  const construction = normalizeDesignConstruction(definition?.construction);
  if (!construction.topVisorEnabled || construction.topVisorDepth <= 0.02) return;
  const controls = designTopVisorControls(p, definition);
  const polygons = designTopVisorPlanarPolygons(p, definition);
  if (!polygons.length) return;
  const features = normalizeDesignFeatures(definition?.features, p);
  const rearFaceZ = -features.extrude.depth / 2;
  const overlap = Math.min(0.08, controls.depth * 0.04);
  const edgeRound = Math.min(controls.radius, controls.depth * 0.42, controls.bandHeight * 0.24);
  designShapesFromPolygons(polygons).forEach((shape) => {
    const extrusion = containedBevelExtrudeOptions(controls.depth, edgeRound, 3);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      ...extrusion.options,
      curveSegments: 8,
      steps: 1
    });
    geometry.translate(0, 0, -extrusion.centerOffset);
    geometry.computeVertexNormals();
    const shield = new THREE.Mesh(geometry, material);
    shield.name = "top-light-shield";
    shield.position.z = rearFaceZ - controls.depth / 2 + overlap;
    target.add(shield);
  });
}

function designLensInsertExpansion(construction) {
  const normalized = normalizeDesignConstruction(construction);
  return THREE.MathUtils.clamp(
    normalized.lensSeatDepth - normalized.lensClearance,
    0,
    normalized.lensSeatDepth
  );
}

function addDesignLens(x, p, material, definition, target = designModelGroup) {
  const construction = normalizeDesignConstruction(definition?.construction);
  const seatingExpansion = designLensInsertExpansion(construction);
  const shape = ringPath(designOutlineRing(0, p, definition, seatingExpansion));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: construction.lensThickness, bevelEnabled: false });
  geometry.translate(0, 0, -construction.lensThickness / 2);
  const lens = new THREE.Mesh(geometry, material);
  lens.position.set(x, 0, construction.lensChannelOffset);
  lens.scale.x = x < 0 ? -1 : 1;
  target.add(lens);
}

function designLaserSvgPathFromRing(ring, bounds) {
  const points = designCleanRing(ring);
  if (!points.length) return "";
  const commands = points.map(([x, y], index) => {
    const command = index === 0 ? "M" : "L";
    return `${command} ${formatSvgNumber(x - bounds.minX)} ${formatSvgNumber(bounds.maxY - y)}`;
  });
  commands.push("Z");
  return commands.join(" ");
}

function buildDesignLensesLaserSvg(projectRoot, definition = designDefinitionFromDraft()) {
  const p = designGeometryParams();
  const construction = normalizeDesignConstruction(definition?.construction);
  const seatingExpansion = designLensInsertExpansion(construction);
  const lensCenter = designLensCenter(p);
  const rings = [
    {
      id: "left-lens",
      label: "Left lens",
      ring: designCleanRing(designOutlineRing(-lensCenter, p, definition, seatingExpansion, true))
    },
    {
      id: "right-lens",
      label: "Right lens",
      ring: designCleanRing(designOutlineRing(lensCenter, p, definition, seatingExpansion, false))
    }
  ].filter((item) => item.ring.length >= 3);
  const allPoints = rings.flatMap((item) => item.ring);
  if (!allPoints.length) throw new Error("No lens outline for laser SVG.");
  const padding = 2;
  const bounds = allPoints.reduce((next, [x, y]) => ({
    minX: Math.min(next.minX, x),
    minY: Math.min(next.minY, y),
    maxX: Math.max(next.maxX, x),
    maxY: Math.max(next.maxY, y)
  }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
  bounds.minX -= padding;
  bounds.minY -= padding;
  bounds.maxX += padding;
  bounds.maxY += padding;
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const paths = rings.map((item) => {
    const d = designLaserSvgPathFromRing(item.ring, bounds);
    return `  <path id="${escapeXml(item.id)}" aria-label="${escapeXml(item.label)}" d="${d}"/>`;
  }).join("\n");
  const title = `${projectRoot || "frame-lab-creator"} lenses for laser`;
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${formatSvgNumber(width)}mm" height="${formatSvgNumber(height)}mm" viewBox="0 0 ${formatSvgNumber(width)} ${formatSvgNumber(height)}">`,
    `  <title>${escapeXml(title)}</title>`,
    `  <desc>1:1 lens cutting outlines in millimeters. Use as line cutting geometry.</desc>`,
    `  <g fill="none" stroke="#000000" stroke-width="0.1" vector-effect="non-scaling-stroke">`,
    paths,
    `  </g>`,
    `</svg>`,
    ``
  ].join("\n");
}

function designHingePadOrigin(side, p, definition = state.designDraft) {
  const construction = normalizeDesignConstruction(definition?.construction);
  return new THREE.Vector3(
    side * (designRimSpan(p) / 2 - designHingePadOverlap + construction.hingeMountOffset),
    construction.hingeMountHeight,
    0
  );
}

function designHingePadCenter(side, p, definition = state.designDraft) {
  const center = designHingePadOrigin(side, p, definition);
  center.x += side * designHingePadSize / 2;
  center.y += designHingePadSize / 2;
  return center;
}

function designHingeDatum(side, p, definition = state.designDraft) {
  const features = normalizeDesignFeatures(definition?.features, p);
  const datum = designHingePadOrigin(side, p, definition);
  datum.z = -features.extrude.depth / 2 + designHingeRearOverlap;
  return datum;
}

function effectiveTempleConstruction(definition, p) {
  const construction = normalizeDesignConstruction(definition?.construction);
  const authoredLength = construction.templeStraight + construction.templeHook;
  return {
    ...construction,
    templeStraight: THREE.MathUtils.clamp(
      construction.templeStraight + p.temple_length - authoredLength,
      35,
      120
    )
  };
}

function designTempleProfileGeometry(definition, p) {
  const construction = normalizeDesignConstruction(definition?.construction);
  const profile = normalizeDesignTempleSketch(definition?.templeSketch, construction);
  const armWidth = construction.templeDepth;
  const templeChamfer = construction.templeChamferEnabled
    ? Math.min(
        construction.templeChamferAmount,
        Math.max(0, armWidth / 2 - 0.02),
        Math.max(0, construction.templeBarHeight * 0.22),
        0.9
      )
    : 0;
  const shape = new THREE.Shape();
  traceRoundedPolygon(
    shape,
    profile.points.map(([x, y]) => ({ x, y })),
    profile.cornerRadii
  );
  const extrusion = containedBevelExtrudeOptions(armWidth, templeChamfer, 1);
  const geometry = new THREE.ExtrudeGeometry(shape, extrusion.options);
  geometry.translate(0, 0, -extrusion.centerOffset);
  geometry.rotateY(Math.PI / 2);
  return geometry;
}

function addDesignTemple(side, p, outerLensWidth, frameMaterial, detailMaterial, style, definition, target = designModelGroup) {
  const baseConstruction = effectiveTempleConstruction(definition, p);
  const construction = normalizeDesignTempleTextPlacement(
    baseConstruction,
    normalizeDesignTempleSketch(definition?.templeSketch, baseConstruction),
    style
  );
  const temple = new THREE.Group();
  temple.position.copy(designHingeDatum(side, p, definition));
  temple.rotation.y = side * THREE.MathUtils.degToRad(p.temple_spread);
  addDesignHingeAsset(side < 0 ? "templeRight" : "templeLeft", new THREE.Vector3(), frameMaterial, temple);
  const armWidth = construction.templeDepth;
  const attachX = side * 2.5;
  const armStartZ = designTempleProfileStartZ;
  const profile = new THREE.Mesh(designTempleProfileGeometry(definition, p), frameMaterial);
  profile.position.set(attachX, designTempleBarCenterY, armStartZ);
  temple.add(profile);
  if (style.templeDetailMode === "texture") {
    addDesignTempleRelief(side, temple, detailMaterial, construction, style.templePattern);
  }
  const templeText = side < 0 ? style.rightTempleText : style.leftTempleText;
  if (style.templeDetailMode === "text" && templeText) {
    addDesignTextRelief(templeText, side, temple, detailMaterial, construction);
  }
  target.add(temple);
}

function addDesignTempleRelief(side, temple, material, construction, pattern) {
  const depth = construction.templeTextureDepth;
  const outsideX = side * (2.5 + construction.templeDepth / 2 + depth / 2 - 0.06);
  const maxEnd = Math.max(0, construction.templeStraight - 4);
  const start = Math.min(Math.max(0, construction.templePatternStart), maxEnd);
  const limit = Math.min(Math.max(start, construction.templePatternEnd), maxEnd);
  const detailSize = Math.max(0.5, construction.templePatternSize);
  const ribWidth = Math.max(0.5, Math.min(1.8, detailSize * 0.22));
  const markHeight = Math.max(0.65, Math.min(construction.templeBarHeight * 0.72, detailSize * 1.1));
  const stripHeight = Math.max(0.45, Math.min(1.25, detailSize * 0.17));
  const addMark = (width, height, z, angle = 0, yOffset = 0) => {
    const mark = new THREE.Mesh(roundedPrismGeometry(width, height, depth, Math.min(0.26, height / 3), 0.04), material);
    mark.rotation.y = Math.PI / 2;
    mark.rotation.x = angle;
    mark.position.set(outsideX, designTempleBarCenterY + yOffset, designTempleProfileStartZ - z);
    temple.add(mark);
  };
  for (let z = start, index = 0; z <= limit; z += construction.templePatternSpacing, index += 1) {
    const segment = detailSize;
    if (pattern === "ribs") {
      addMark(ribWidth, markHeight, z);
    } else if (pattern === "micro-ribs") {
      const offset = Math.min(1.25, detailSize * 0.28);
      addMark(ribWidth * 0.72, markHeight * 0.82, z - offset);
      addMark(ribWidth * 0.72, markHeight * 0.82, z + offset);
    } else if (pattern === "slots") {
      addMark(segment, stripHeight, z);
    } else if (pattern === "dots") {
      const dot = Math.max(0.7, Math.min(construction.templeBarHeight * 0.5, detailSize * 0.58));
      addMark(dot, dot, z);
    } else if (pattern === "diamond") {
      addMark(segment, stripHeight, z, Math.PI / 4);
      addMark(segment, stripHeight, z, -Math.PI / 4);
    } else {
      addMark(segment, stripHeight, z, (index % 2 ? -1 : 1) * Math.PI / 5);
    }
  }
}

function addDesignTextRelief(text, side, temple, material, construction) {
  if (!designTextFont) {
    loadDesignTextFont();
    return;
  }
  const geometry = new TextGeometry(text, {
    font: designTextFont,
    size: construction.templeTextSize,
    depth: construction.templeTextDepth,
    curveSegments: 4,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.025,
    bevelSegments: 1
  });
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const width = box.max.x - box.min.x;
  const height = box.max.y - box.min.y;
  geometry.translate(-width / 2, -height / 2, 0);
  const mark = new THREE.Mesh(geometry, material);
  mark.rotation.y = side < 0 ? -Math.PI / 2 : Math.PI / 2;
  mark.position.set(
    side * (2.5 + construction.templeDepth / 2 - construction.templeTextDepth * 0.35),
    designTempleBarCenterY + construction.templeTextYOffset,
    designTempleProfileStartZ - construction.templeTextPosition
  );
  temple.add(mark);
}

function bindUi() {
  if (uiBound) return;
  uiBound = true;

  els.controls.addEventListener("input", (event) => {
    const input = event.target;
    if (!input.dataset.param) return;
    state.params[input.dataset.param] = Number(input.value);
    document.querySelector(`#${input.dataset.param}Output`).value = formatValue(input.value, findParam(input.dataset.param)?.[6] || "");
    state.previewMode = "parametric";
    updateGeneratedSource();
    render({ fitView: false });
    syncActiveModel({ persist: false });
    scheduleModelPersist();
  });

  els.builderControls.addEventListener("change", (event) => {
    const select = event.target.closest("[data-component-model]");
    if (!select) return;
    state.assembly[select.dataset.componentModel].modelId = select.value;
    applyAssemblyToParams();
    buildBuilderControls();
    buildControls();
    updateGeneratedSource();
    render({ fitView: false });
    syncActiveModel({ persist: false });
    scheduleModelPersist();
  });

  els.builderControls.addEventListener("toggle", (event) => {
    const details = event.target.closest("details[data-component-options]");
    if (!details) return;
    state.openComponentOptions[details.dataset.componentOptions] = details.open;
  }, true);

  els.builderControls.addEventListener("click", (event) => {
    const editSlot = event.target.closest("[data-edit-color-slot]");
    if (editSlot) {
      const index = Number(editSlot.dataset.editColorSlot);
      openColorPickerEditor({
        type: "slot",
        index,
        color: state.colorSlots[index],
        title: `Color slot ${index + 1}`
      });
      return;
    }

    const colorSlot = event.target.closest("[data-apply-color-slot]");
    if (colorSlot) {
      const key = colorSlot.dataset.applyColorSlot;
      openColorPickerEditor({
        type: "component",
        key,
        color: colorSlot.dataset.color,
        source: "slot",
        title: `${colorSlot.dataset.componentLabel} color`
      });
      return;
    }

    const openColorEditor = event.target.closest("[data-open-component-color]");
    if (openColorEditor) {
      const key = openColorEditor.dataset.openComponentColor;
      openColorPickerEditor({
        type: "component",
        key,
        color: openColorEditor.dataset.currentColor,
        source: "custom",
        title: `${openColorEditor.dataset.componentLabel} color`
      });
      return;
    }

    const option = event.target.closest("[data-component-option]");
    if (option) {
      state.assembly[option.dataset.componentOption].modelId = option.dataset.modelId;
      applyAssemblyToParams();
      buildBuilderControls();
      buildControls();
      updateGeneratedSource();
      render({ fitView: false });
      syncActiveModel({ persist: false });
      scheduleModelPersist();
      return;
    }

    const button = event.target.closest("[data-assembly-size]");
    if (!button) return;
    setAssemblySize(button.dataset.assemblySize);
    applyAssemblyToParams();
    buildBuilderControls();
    buildControls();
    updateGeneratedSource();
    render({ fitView: false });
    syncActiveModel({ persist: false });
    scheduleModelPersist();
  });

  els.sunGalleryGrid.addEventListener("click", handleGalleryClick);
  els.opticalGalleryGrid?.addEventListener("click", handleGalleryClick);
  els.developerCollectionList?.addEventListener("click", handleDeveloperCollectionListClick);
  els.designSubmissionList?.addEventListener("click", handleDesignSubmissionReviewClick);
  els.componentFileList.addEventListener("click", handleComponentFileListClick);
  els.frameEditorComponentGallery?.addEventListener("click", handleComponentFileListClick);
  els.addCollection.addEventListener("click", addCollectionFromStudio);
  els.collectionImageInput.addEventListener("change", handleCollectionImageSelect);
  els.developerCollectionPhotoInput?.addEventListener("change", handleDeveloperCollectionPhotoSelect);
  els.componentFileInput.addEventListener("change", handleComponentFileSelect);
  els.componentKind.addEventListener("change", syncComponentSideInput);
  els.accountButton.addEventListener("click", () => {
    els.accountPanel.hidden = false;
    updateAccountUi();
    if (state.account.role === "visitor") els.accountEmail.focus();
  });
  els.plansButton.addEventListener("click", (event) => {
    event.preventDefault();
    scrollHomeSection("#plansPublicPanel");
  });
  els.closeAccountPanel.addEventListener("click", () => {
    els.accountPanel.hidden = true;
  });
  els.closeProfilePanel.addEventListener("click", () => {
    els.accountPanel.hidden = true;
  });
  els.closePlansPanel.addEventListener("click", () => {
    els.plansPanel.hidden = true;
    els.plansButton?.classList.remove("active");
  });
  els.authModeButtons.forEach((button) => {
    button.addEventListener("click", () => setAuthMode(button.dataset.authMode === "register" ? "register" : "login"));
  });
  els.passwordToggleButtons.forEach((button) => {
    button.addEventListener("click", () => togglePasswordVisibility(button));
  });
  els.signInAccount.addEventListener("click", () => signInAccount());
  els.accountPanel.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    if (event.target === els.licenseCodeInput) {
      event.preventDefault();
      redeemLicenseCode();
      return;
    }
    if (state.account.role !== "visitor") return;
    event.preventDefault();
    signInAccount();
  });
  els.licenseCodeInput.addEventListener("input", () => {
    els.licenseCodeInput.value = formatLicenseCode(els.licenseCodeInput.value);
  });
  els.accountRegistrationCode?.addEventListener("input", () => {
    els.accountRegistrationCode.value = formatLicenseCode(els.accountRegistrationCode.value);
  });
  els.redeemLicenseCode.addEventListener("click", () => redeemLicenseCode());
  els.planLicenseCodeInput?.addEventListener("input", () => {
    els.planLicenseCodeInput.value = formatLicenseCode(els.planLicenseCodeInput.value);
  });
  els.planLicenseCodeInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    redeemLicenseCode("plans");
  });
  els.redeemPlanLicenseCode?.addEventListener("click", () => redeemLicenseCode("plans"));
  els.publicPlanLicenseCodeInput?.addEventListener("input", () => {
    els.publicPlanLicenseCodeInput.value = formatLicenseCode(els.publicPlanLicenseCodeInput.value);
  });
  els.publicPlanLicenseCodeInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    redeemLicenseCode("public-plans");
  });
  els.redeemPublicPlanLicenseCode?.addEventListener("click", () => redeemLicenseCode("public-plans"));
  els.pricingGrid?.addEventListener("click", selectPricingPlan);
  els.publicPricingGrid?.addEventListener("click", selectPricingPlan);
  els.pricingGrid?.addEventListener("keydown", handlePricingPlanKeydown);
  els.publicPricingGrid?.addEventListener("keydown", handlePricingPlanKeydown);
  els.plansCarouselPrevious?.addEventListener("click", (event) => activatePlansCarouselControl(event, -1));
  els.plansCarouselNext?.addEventListener("click", (event) => activatePlansCarouselControl(event, 1));
  els.plansCarouselPrevious?.addEventListener("pointerup", (event) => activatePlansCarouselControl(event, -1));
  els.plansCarouselNext?.addEventListener("pointerup", (event) => activatePlansCarouselControl(event, 1));
  els.plansCarouselPrevious?.addEventListener("keydown", (event) => handlePlansCarouselControlKeydown(event, -1));
  els.plansCarouselNext?.addEventListener("keydown", (event) => handlePlansCarouselControlKeydown(event, 1));
  els.signOutAccount.addEventListener("click", () => signOutAccount());
  els.profileSignOut.addEventListener("click", () => signOutAccount());
  els.cancelSubscription.addEventListener("click", () => cancelSubscription());
  els.saveFitProfile?.addEventListener("click", () => saveFitProfile());
  els.profileOpenPlans.addEventListener("click", () => {
    els.accountPanel.hidden = true;
    openPlansPanel();
  });
  els.planButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.account.plan = button.dataset.plan;
      updateAccountUi();
    });
  });
  [els.cropZoom, els.cropX, els.cropY].forEach((input) => input.addEventListener("input", drawImageCrop));
  els.applyCrop.addEventListener("click", applyImageCrop);
  els.cancelCrop.addEventListener("click", cancelImageCrop);
  els.openHome.addEventListener("click", (event) => {
    event.preventDefault();
    goHome();
  });
  els.brandHome?.addEventListener("click", goHome);
  els.openConfigurator.addEventListener("click", () => navigateToView("configurator"));
  els.openGallery.addEventListener("click", (event) => {
    event.preventDefault();
    syncActiveModel();
    renderGallery();
    scrollGalleryIntoView();
  });
  [
    [els.openPrintGuide, "#printGuidePanel"],
    [els.openRoadmap, "#roadmapPanel"],
    [els.openLicenseInfo, "#licenseInfoPanel"],
    [els.openFaq, "#faqPanel"]
  ].forEach(([link, target]) => {
    link?.addEventListener("click", (event) => {
      event.preventDefault();
      scrollHomeSection(target);
    });
  });
  els.openStudio.addEventListener("click", (event) => {
    event.preventDefault();
    navigateToView("developer");
  });
  els.clearStudioEdit?.addEventListener("click", () => {
    clearCollectionForm();
    navigateToView("collection-editor");
  });
  els.backToDeveloper?.addEventListener("click", () => {
    navigateToView("developer");
  });
  els.newDeveloperCollection?.addEventListener("click", () => {
    clearCollectionForm();
    navigateToView("collection-editor");
  });
  els.openLicenses.addEventListener("click", async (event) => {
    event.preventDefault();
    navigateToView("licenses");
    await Promise.all([loadStaticLicenseCodes(), loadLicenseCodes()]);
  });
  els.brandAccentColor?.addEventListener("input", () => {
    setBrandColor("accentColor", els.brandAccentColor.value, { previewOnly: true });
  });
  els.brandAccentText?.addEventListener("input", () => {
    setBrandColor("accentColor", els.brandAccentText.value, { previewOnly: true });
  });
  [
    ["backgroundColor", els.brandBackgroundColor],
    ["surfaceColor", els.brandSurfaceColor],
    ["textColor", els.brandTextColor],
    ["mutedColor", els.brandMutedColor],
    ["borderColor", els.brandBorderColor],
    ["sceneColor", els.brandSceneColor]
  ].forEach(([key, input]) => {
    input?.addEventListener("input", () => setBrandColor(key, input.value, { previewOnly: true }));
  });
  els.heroTitleInput?.addEventListener("input", () => {
    state.brandSettings.heroTitle = els.heroTitleInput.value;
    applyBrandSettings();
    if (els.brandSettingsNote) els.brandSettingsNote.textContent = "Previewing hero text. Save to publish it.";
  });
  els.heroTextInput?.addEventListener("input", () => {
    state.brandSettings.heroText = els.heroTextInput.value;
    applyBrandSettings();
    if (els.brandSettingsNote) els.brandSettingsNote.textContent = "Previewing hero text. Save to publish it.";
  });
  els.heroEditorTarget?.addEventListener("change", () => {
    state.brandSettings.heroModelId = els.heroEditorTarget.value;
    applyBrandSettings();
    if (els.brandSettingsNote) els.brandSettingsNote.textContent = "Previewing hero editor target. Save to publish it.";
  });
  els.heroImageInput?.addEventListener("change", handleHeroImageSelect);
  els.resetHeroImage?.addEventListener("click", () => {
    state.brandSettings.heroImage = "";
    applyBrandSettings();
    if (els.heroImageInput) els.heroImageInput.value = "";
    if (els.brandSettingsNote) els.brandSettingsNote.textContent = "Default hero image selected. Save to publish it.";
  });
  els.pageContentEditor?.addEventListener("change", (event) => {
    const imageInput = event.target.closest("[data-print-guide-image]");
    if (imageInput) handlePrintGuideImageSelect(imageInput.files?.[0]);
  });
  els.pageContentEditor?.addEventListener("click", (event) => {
    if (!event.target.closest("[data-clear-print-guide-image]")) return;
    state.brandSettings.content = normalizeContentSettings({
      ...state.brandSettings.content,
      printGuide: {
        ...state.brandSettings.content.printGuide,
        image: ""
      }
    });
    applyBrandSettings();
    if (els.brandSettingsNote) els.brandSettingsNote.textContent = "Print guide image cleared. Save to publish it.";
  });
  els.publishingEnabledToggle?.addEventListener("change", () => {
    state.brandSettings.publishingEnabled = els.publishingEnabledToggle.checked === true;
    updateDesignPublishingAccess();
    if (els.brandSettingsNote) {
      els.brandSettingsNote.textContent = state.brandSettings.publishingEnabled
        ? "Public publishing will be enabled after saving."
        : "Public publishing will be locked after saving.";
    }
  });
  els.saveBrandSettings?.addEventListener("click", () => saveBrandSettings());
  els.resetBrandSettings?.addEventListener("click", () => resetBrandSettings());
  els.refreshStorageDebug?.addEventListener("click", () => loadStorageDebug());
  els.generateLicenseCodes.addEventListener("click", () => generateLicenseCodes());
  els.staticLicenseCodeList?.addEventListener("click", handleLicenseCertificateClick);
  els.licenseCodeList?.addEventListener("click", handleLicenseCertificateClick);
  els.heroBrowse.addEventListener("click", scrollGalleryIntoView);
  els.heroEditor.addEventListener("click", () => {
    if (!canOpenCreator()) return;
    resetDesignDraft();
    navigateToView("design-lab");
  });
  els.startDesignLab?.addEventListener("click", () => {
    if (!canOpenCreator()) return;
    resetDesignDraft();
    navigateToView("design-lab");
  });
  els.exitDesignLab?.addEventListener("click", scrollGalleryIntoView);
  els.designTabs.forEach((button) => button.addEventListener("click", () => switchDesignTab(button.dataset.designTab)));
  [
    els.designStageTools,
    els.designOperationsPanel,
    els.designFeaturesPanel,
    els.designRightTemplePanel,
    els.designAssemblyPanel,
    els.designAppearancePanel
  ].forEach((panel) => {
    panel?.addEventListener("input", handleDesignOperationChange);
    panel?.addEventListener("change", handleDesignOperationChange);
    panel?.addEventListener("focusout", (event) => {
      if (event.target.matches('input[type="number"], input[type="text"], textarea')) {
        handleDesignOperationChange(event);
      }
    });
  });
  els.designViewSketch?.addEventListener("click", () => setDesignView("sketch"));
  els.designView3d?.addEventListener("click", () => setDesignView("3d"));
  els.designUndo?.addEventListener("click", undoDesignChange);
  els.designRedo?.addEventListener("click", redoDesignChange);
  els.designMeasureToggle?.addEventListener("click", () => setDesignMeasureMode(!designMeasureMode));
  els.designMeasureClear?.addEventListener("click", () => clearDesignMeasurement(true));
  els.addSketchPoint?.addEventListener("click", addDesignSketchPoint);
  els.removeSketchPoint?.addEventListener("click", removeDesignSketchPoint);
  els.designSharpCorner?.addEventListener("click", () => updateSelectedDesignCorner(0));
  els.addTemplePoint?.addEventListener("click", addDesignTempleSketchPoint);
  els.removeTemplePoint?.addEventListener("click", removeDesignTempleSketchPoint);
  els.designTempleSharpCorner?.addEventListener("click", () => updateSelectedDesignTempleCorner(0));
  els.designName?.addEventListener("input", handleDesignProjectCopyChange);
  els.designDescription?.addEventListener("input", handleDesignProjectCopyChange);
  els.regenerateDesignCode?.addEventListener("click", () => {
    state.designDraft.manualCode = false;
    syncDesignCode();
    setDesignNote("OpenSCAD code regenerated from operations.");
  });
  els.applyDesignCode?.addEventListener("click", applyDesignCode);
  els.resetDesign?.addEventListener("click", () => resetDesignDraft({ capture: true }));
  els.exportDesign3mf?.addEventListener("click", exportDesign3mf);
  els.downloadDesignScad?.addEventListener("click", exportDesignScad);
  els.saveDesignCollection?.addEventListener("click", saveDesignToCollections);
  els.submitDesign?.addEventListener("click", submitDesignForReview);
  els.printGuideButton?.addEventListener("click", () => scrollHomeSection("#printGuidePanel"));
  els.openPrintGuideImage?.addEventListener("click", openPrintGuideLightbox);
  els.closeImageLightbox?.addEventListener("click", closePrintGuideLightbox);
  els.imageLightbox?.addEventListener("click", (event) => {
    if (event.target === els.imageLightbox) closePrintGuideLightbox();
  });
  els.colorPickerInput?.addEventListener("input", updateColorPickerDraft);
  els.closeColorPicker?.addEventListener("click", closeColorPickerEditor);
  els.cancelColorPicker?.addEventListener("click", closeColorPickerEditor);
  els.applyColorPicker?.addEventListener("click", applyColorPickerEditor);
  els.colorPickerPanel?.addEventListener("click", (event) => {
    if (event.target === els.colorPickerPanel) closeColorPickerEditor();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && els.imageLightbox && !els.imageLightbox.hidden) closePrintGuideLightbox();
    if (event.key === "Escape" && els.colorPickerPanel && !els.colorPickerPanel.hidden) closeColorPickerEditor();
    const target = event.target instanceof HTMLElement ? event.target : null;
    const typing = target?.matches("input, textarea, select") || target?.isContentEditable;
    const designOpen = els.designLab && !els.designLab.hidden;
    if (!designOpen) return;
    if (event.key === "Escape" && designMeasureMode) {
      event.preventDefault();
      setDesignMeasureMode(false);
      return;
    }
    if (typing || !(event.metaKey || event.ctrlKey)) return;
    const key = event.key.toLowerCase();
    if (key === "z" && event.shiftKey) {
      event.preventDefault();
      redoDesignChange();
    } else if (key === "z") {
      event.preventDefault();
      undoDesignChange();
    } else if (key === "y") {
      event.preventDefault();
      redoDesignChange();
    }
  });
  els.saveCurrentModel.addEventListener("click", saveCurrentModel);
  els.resetParams.addEventListener("click", resetParams);
  els.exportScad.addEventListener("click", exportScad);
  els.exportJson.addEventListener("click", exportJson);
  els.copyScad.addEventListener("click", copyScad);
  els.generate3mf.addEventListener("click", generate3mf);
  els.generateStl.addEventListener("click", generateStl);
  els.downloadAssembly.addEventListener("click", downloadAssemblyPackage);
  els.addComponentFile.addEventListener("click", addComponentFile);
  els.saveEndpoint.addEventListener("click", saveEndpoint);
  els.viewFront?.addEventListener("click", () => setView("front"));
  els.viewIso?.addEventListener("click", () => setView("iso"));
  els.viewSide?.addEventListener("click", () => setView("side"));

  els.canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const rect = els.canvas.getBoundingClientRect();
    dragState = {
      mode: event.shiftKey || event.button === 1 || event.button === 2 ? "pan" : "rotate",
      x: event.clientX,
      y: event.clientY,
      rx: state.viewerRotation.x,
      ry: state.viewerRotation.y,
      px: state.viewerPan.x,
      py: state.viewerPan.y,
      rotateSpeed: Math.PI / Math.max(420, Math.min(rect.width, rect.height)),
      panSpeed: viewerPanSpeed(rect.height)
    };
    els.canvas.classList.add(dragState.mode === "pan" ? "is-panning" : "is-rotating");
    els.canvas.setPointerCapture(event.pointerId);
  });
  els.canvas.addEventListener("pointermove", (event) => {
    if (!dragState) return;
    event.preventDefault();
    const dx = event.clientX - dragState.x;
    const dy = event.clientY - dragState.y;
    if (dragState.mode === "pan") {
      state.viewerPan.x = dragState.px + dx * dragState.panSpeed;
      state.viewerPan.y = dragState.py - dy * dragState.panSpeed;
    } else {
      state.viewerRotation.y = normalizeOrbitAngle(dragState.ry + dx * dragState.rotateSpeed);
      state.viewerRotation.x = normalizeOrbitAngle(dragState.rx + dy * dragState.rotateSpeed * 0.82);
    }
    applyViewerTransform();
  });
  els.canvas.addEventListener("pointerup", () => {
    dragState = null;
    els.canvas.classList.remove("is-rotating", "is-panning");
  });
  els.canvas.addEventListener("pointercancel", () => {
    dragState = null;
    els.canvas.classList.remove("is-rotating", "is-panning");
  });
  els.canvas.addEventListener("dblclick", resetViewerPose);
  els.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  els.canvas.addEventListener("wheel", handleCanvasWheel, { passive: false });
  els.designCanvas?.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (designMeasureMode) {
      addDesignMeasurementPoint(event);
      return;
    }
    const rect = els.designCanvas.getBoundingClientRect();
    designDragState = {
      mode: event.shiftKey || event.button === 1 || event.button === 2 ? "pan" : "rotate",
      x: event.clientX,
      y: event.clientY,
      rx: designViewerRotation.x,
      ry: designViewerRotation.y,
      tx: designCameraTarget.x,
      ty: designCameraTarget.y,
      rotateSpeed: Math.PI / Math.max(420, Math.min(rect.width, rect.height)),
      panSpeed: Math.max(0.04, designCameraDistance / Math.max(520, rect.height) * designZoomScale)
    };
    els.designCanvas.classList.add(designDragState.mode === "pan" ? "is-panning" : "is-rotating");
    els.designCanvas.setPointerCapture(event.pointerId);
  });
  els.designCanvas?.addEventListener("pointermove", (event) => {
    if (!designDragState) return;
    event.preventDefault();
    const dx = event.clientX - designDragState.x;
    const dy = event.clientY - designDragState.y;
    if (designDragState.mode === "pan") {
      designCameraTarget.x = designDragState.tx - dx * designDragState.panSpeed;
      designCameraTarget.y = designDragState.ty + dy * designDragState.panSpeed;
      updateDesignCamera();
      return;
    }
    designViewerRotation.y = normalizeOrbitAngle(designDragState.ry + dx * designDragState.rotateSpeed);
    designViewerRotation.x = normalizeOrbitAngle(designDragState.rx + dy * designDragState.rotateSpeed * 0.82);
    designModelGroup.rotation.set(designViewerRotation.x, designViewerRotation.y, designViewerRotation.z);
  });
  const finishDesignDrag = () => {
    designDragState = null;
    els.designCanvas?.classList.remove("is-rotating", "is-panning");
  };
  els.designCanvas?.addEventListener("pointerup", finishDesignDrag);
  els.designCanvas?.addEventListener("pointercancel", finishDesignDrag);
  els.designCanvas?.addEventListener("contextmenu", (event) => event.preventDefault());
  els.designCanvas?.addEventListener("wheel", (event) => {
    event.preventDefault();
    const direction = Math.exp(THREE.MathUtils.clamp(event.deltaY, -220, 220) * 0.0015);
    designZoomScale = THREE.MathUtils.clamp(designZoomScale * direction, 0.34, 3.5);
    updateDesignCamera();
  }, { passive: false });
  els.designCanvas?.addEventListener("dblclick", () => {
    designViewerRotation.x = -0.54;
    designViewerRotation.y = 0.56;
    designViewerRotation.z = 0.02;
    designZoomScale = 1;
    renderDesignPreview({ fitView: true });
  });
}

function t(key) {
  if (Object.prototype.hasOwnProperty.call(translations[state.lang] || {}, key)) {
    return translations[state.lang][key];
  }
  return key;
}

function getParameterText(key, fallbackLabel, fallbackHint) {
  return {
    label: t(`param_${key}_label`) || fallbackLabel,
    hint: t(`param_${key}_hint`) || fallbackHint
  };
}

function buildDesignControls() {
  const renderGroup = (entries) => entries.map(([key, label]) => {
    const [, , , min, max, step, unit] = findParam(key);
    const value = state.designDraft.params[key];
    return `
      <div class="design-control">
        <label for="design-${escapeHtml(key)}">${escapeHtml(label)}</label>
        <input id="design-${escapeHtml(key)}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-design-param="${escapeHtml(key)}" />
        <output id="design-${escapeHtml(key)}-output">${escapeHtml(formatValue(value, unit))}</output>
      </div>
    `;
  }).join("");
  if (els.designFrontControls) els.designFrontControls.innerHTML = renderGroup(designParameterGroups.front);
  if (els.designTempleControls) els.designTempleControls.innerHTML = renderGroup(designParameterGroups.temples);
  if (els.designPublicParameters) {
    const exposed = normalizeDesignPublicParameters(state.designDraft.publicParameters);
    const ranges = normalizeDesignSliderRanges(state.designDraft.sliderRanges);
    els.designPublicParameters.innerHTML = designPublicParameterKeys.map((key) => {
      const [, label, , , , step, unit] = findParam(key);
      const range = ranges[key];
      return `
        <article class="design-public-item${exposed.includes(key) ? " active" : ""}">
          <label class="design-public-toggle">
            <input type="checkbox" data-public-design-param="${escapeHtml(key)}"${exposed.includes(key) ? " checked" : ""} />
            <span>${escapeHtml(label)}</span>
            <small>slider</small>
          </label>
          <div class="design-public-range" aria-label="${escapeHtml(label)} range">
            <label><span>Min</span><input type="number" step="${step}" value="${range.min}" data-public-range-param="${escapeHtml(key)}" data-public-range-bound="min" /><small>${escapeHtml(unit)}</small></label>
            <label><span>Max</span><input type="number" step="${step}" value="${range.max}" data-public-range-param="${escapeHtml(key)}" data-public-range-bound="max" /><small>${escapeHtml(unit)}</small></label>
          </div>
        </article>
      `;
    }).join("");
  }
  syncDesignFields();
  syncDesignCode();
}

function setDesignFieldValue(field, value) {
  if (field && document.activeElement !== field) field.value = String(value);
}

function setDesignSliderFieldValue(field, value, unit = "") {
  setDesignFieldValue(field, value);
  const readout = field?.nextElementSibling;
  if (readout && ["OUTPUT", "SMALL"].includes(readout.tagName)) {
    const separator = unit === "%" ? "" : " ";
    readout.textContent = `${formatNumber(value)}${unit ? `${separator}${unit}` : ""}`;
  }
}

function syncDesignFields() {
  const draft = state.designDraft;
  setDesignFieldValue(els.designName, draft.name);
  setDesignFieldValue(els.designDescription, draft.description);
  [...designParameterGroups.front, ...designParameterGroups.temples].forEach(([key]) => {
    const input = document.querySelector(`[data-design-param="${key}"]`);
    const output = document.querySelector(`#design-${key}-output`);
    const unit = findParam(key)?.[6] || "";
    if (input) input.value = String(draft.params[key]);
    if (output) output.textContent = formatValue(draft.params[key], unit);
  });
  const style = normalizeDesignStyle(draft.style);
  if (els.designLensShape) els.designLensShape.value = style.lensShape;
  if (els.designTempleDetailMode) els.designTempleDetailMode.value = style.templeDetailMode;
  if (els.designTemplePattern) els.designTemplePattern.value = style.templePattern;
  if (els.designTempleTextureControls) els.designTempleTextureControls.hidden = style.templeDetailMode !== "texture";
  if (els.designTempleTextControls) els.designTempleTextControls.hidden = false;
  if (els.designRightTempleTextControls) els.designRightTempleTextControls.hidden = false;
  setDesignFieldValue(els.designTempleText, style.leftTempleText);
  setDesignFieldValue(els.designRightTempleText, style.rightTempleText);
  if (els.designBrowBar) els.designBrowBar.checked = style.browBar;
  if (els.designFrameColor) els.designFrameColor.value = style.frameColor;
  if (els.designTempleColor) els.designTempleColor.value = style.templeColor;
  if (els.designLensColor) els.designLensColor.value = style.lensColor;
  if (els.designDetailColor) els.designDetailColor.value = style.detailColor;
  setDesignSliderFieldValue(els.designFrameOpacity, designOpacityPercent(style.frameOpacity, 1), "%");
  setDesignSliderFieldValue(els.designTempleOpacity, designOpacityPercent(style.templeOpacity, 1), "%");
  setDesignSliderFieldValue(els.designLensOpacity, designOpacityPercent(style.lensOpacity, defaultDesignStyle.lensOpacity), "%");
  const features = normalizeDesignFeatures(draft.features, draft.params);
  setDesignSliderFieldValue(els.designExtrudeDepth, features.extrude.depth, "mm");
  setDesignSliderFieldValue(els.designChamferAmount, features.chamfer.enabled ? features.chamfer.amount : 0, "mm");
  setDesignSliderFieldValue(els.designFilletRadius, features.fillet.enabled ? features.fillet.radius : 0, "mm");
  if (els.designLensRecessEnabled) els.designLensRecessEnabled.checked = features.lensRecess.enabled;
  setDesignFieldValue(els.designLensRecessDepth, features.lensRecess.depth);
  const rawConstruction = normalizeDesignConstruction(draft.construction);
  const construction = normalizeDesignTempleTextPlacement(
    rawConstruction,
    normalizeDesignTempleSketch(draft.templeSketch, rawConstruction),
    style
  );
  setDesignFieldValue(els.designLensSlotWidth, construction.lensSeatWidth);
  setDesignFieldValue(els.designLensCaptureDepth, construction.lensSeatDepth);
  setDesignFieldValue(els.designLensClearance, construction.lensClearance);
  setDesignFieldValue(els.designLensChannelOffset, construction.lensChannelOffset);
  if (els.designLensSlotMetric) els.designLensSlotMetric.textContent = `${formatNumber(construction.lensSeatWidth)} mm`;
  if (els.designLensCaptureMetric) els.designLensCaptureMetric.textContent = `${formatNumber(construction.lensSeatDepth)} mm`;
  if (els.designLensChannelSummary) {
    els.designLensChannelSummary.textContent = `${formatNumber(construction.lensSeatWidth)} mm slot / ${formatNumber(construction.lensSeatDepth)} mm grip / ${formatNumber(construction.lensClearance)} mm clearance`;
  }
  setDesignFieldValue(els.designHingeMountHeight, construction.hingeMountHeight);
  setDesignFieldValue(els.designHingeMountOffset, construction.hingeMountOffset);
  setDesignFieldValue(els.designBridgeThickness, construction.bridgeThickness);
  setDesignSliderFieldValue(els.designBridgeBlendRadius, construction.bridgeBlendRadius, "mm");
  setDesignSliderFieldValue(els.designNoseWingHeight, construction.noseWingHeight, "mm");
  setDesignSliderFieldValue(els.designNoseWingAngle, construction.noseWingAngle, "deg");
  setDesignSliderFieldValue(els.designNoseWingRound, construction.noseWingTopRound, "mm");
  setDesignSliderFieldValue(els.designNoseWingBaseRound, construction.noseWingBaseRound, "mm");
  if (els.designTopVisorEnabled) els.designTopVisorEnabled.checked = construction.topVisorEnabled;
  setDesignSliderFieldValue(els.designTopVisorDepth, construction.topVisorDepth, "mm");
  setDesignSliderFieldValue(els.designTopVisorBandHeight, construction.topVisorBandHeight, "mm");
  setDesignSliderFieldValue(els.designTopVisorRadius, construction.topVisorRadius, "mm");
  setDesignSliderFieldValue(els.designTempleStraight, construction.templeStraight, "mm");
  setDesignSliderFieldValue(els.designTempleHook, construction.templeHook, "mm");
  setDesignSliderFieldValue(els.designTempleHookAngle, construction.templeHookAngle, "deg");
  setDesignSliderFieldValue(els.designTempleBarHeight, construction.templeBarHeight, "mm");
  setDesignSliderFieldValue(els.designTempleDepth, construction.templeDepth, "mm");
  setDesignSliderFieldValue(els.designTempleCornerRadius, construction.templeCornerRadius, "mm");
  if (els.designTempleChamferEnabled) els.designTempleChamferEnabled.checked = construction.templeChamferEnabled;
  setDesignSliderFieldValue(els.designTempleChamferAmount, construction.templeChamferAmount, "mm");
  setDesignSliderFieldValue(els.designTempleTextureDepth, construction.templeTextureDepth, "mm");
  setDesignSliderFieldValue(els.designTemplePatternStart, construction.templePatternStart, "mm");
  setDesignSliderFieldValue(els.designTemplePatternEnd, construction.templePatternEnd, "mm");
  setDesignSliderFieldValue(els.designTemplePatternSpacing, construction.templePatternSpacing, "mm");
  setDesignSliderFieldValue(els.designTemplePatternSize, construction.templePatternSize, "mm");
  setDesignSliderFieldValue(els.designTempleTextSize, construction.templeTextSize, "mm");
  setDesignSliderFieldValue(els.designTempleTextPosition, construction.templeTextPosition, "mm");
  setDesignSliderFieldValue(els.designTempleTextDepth, construction.templeTextDepth, "mm");
  syncDesignSelectedCornerField();
  syncDesignTempleSelectedCornerField();
  renderDesignFitWarnings();
  renderDesignProductionChecks();
}

function syncDesignSelectedCornerField() {
  const sketch = normalizeDesignSketch(state.designDraft.sketch);
  if (isDesignNoseWingSelection(designSketchSelectedIndex)) {
    const handleIndex = THREE.MathUtils.clamp(designNoseWingSelectionHandleIndex(designSketchSelectedIndex), 0, 3);
    designSketchSelectedIndex = designNoseWingHandleSelectionOffset + handleIndex;
    if (els.designSelectedCornerLabel) {
      els.designSelectedCornerLabel.textContent = designNoseWingHandleLabel(handleIndex);
    }
    if (els.designSelectedCornerRadius) {
      els.designSelectedCornerRadius.value = "";
      els.designSelectedCornerRadius.disabled = true;
      const unitLabel = els.designSelectedCornerRadius.nextElementSibling;
      if (unitLabel?.tagName === "SMALL") unitLabel.textContent = "";
    }
    return;
  }
  if (isDesignBridgeSelection(designSketchSelectedIndex)) {
    const handleIndex = THREE.MathUtils.clamp(designBridgeSelectionHandleIndex(designSketchSelectedIndex), 0, 1);
    designSketchSelectedIndex = designBridgeHandleSelectionOffset + handleIndex;
    if (els.designSelectedCornerLabel) {
      els.designSelectedCornerLabel.textContent = handleIndex === 1 ? "Lower bridge line" : "Upper bridge line";
    }
    if (els.designSelectedCornerRadius) {
      els.designSelectedCornerRadius.value = "";
      els.designSelectedCornerRadius.disabled = true;
      const unitLabel = els.designSelectedCornerRadius.nextElementSibling;
      if (unitLabel?.tagName === "SMALL") unitLabel.textContent = "";
    }
    return;
  }
  if (isDesignTopVisorSelection(designSketchSelectedIndex)) {
    const handleIndex = THREE.MathUtils.clamp(designTopVisorSelectionHandleIndex(designSketchSelectedIndex), 0, 1);
    designSketchSelectedIndex = designTopVisorHandleSelectionOffset + handleIndex;
    if (els.designSelectedCornerLabel) {
      els.designSelectedCornerLabel.textContent = handleIndex === 0 ? "Right lens shield start" : "Right lens shield end";
    }
    if (els.designSelectedCornerRadius) {
      els.designSelectedCornerRadius.value = "";
      els.designSelectedCornerRadius.disabled = true;
      const unitLabel = els.designSelectedCornerRadius.nextElementSibling;
      if (unitLabel?.tagName === "SMALL") unitLabel.textContent = "";
    }
    return;
  }
  designSketchSelectedIndex = Math.max(0, Math.min(designSketchSelectedIndex, sketch.points.length - 1));
  if (els.designSelectedCornerLabel) els.designSelectedCornerLabel.textContent = `Point ${designSketchSelectedIndex + 1} radius`;
  if (els.designSelectedCornerRadius) {
    els.designSelectedCornerRadius.disabled = false;
    setDesignSliderFieldValue(els.designSelectedCornerRadius, sketch.cornerRadii[designSketchSelectedIndex] || 0, "mm");
  }
}

function updateSelectedDesignCorner(radius, options = {}) {
  if (isDesignNoseWingSelection(designSketchSelectedIndex)) {
    syncDesignSelectedCornerField();
    return;
  }
  if (isDesignBridgeSelection(designSketchSelectedIndex)) {
    syncDesignSelectedCornerField();
    return;
  }
  if (isDesignTopVisorSelection(designSketchSelectedIndex)) {
    syncDesignSelectedCornerField();
    return;
  }
  const sketch = normalizeDesignSketch(state.designDraft.sketch);
  const nextRadius = THREE.MathUtils.clamp(parseDesignNumber(radius, 0), 0, 30);
  if ((sketch.cornerRadii[designSketchSelectedIndex] || 0) === nextRadius) return;
  if (options.capture !== false) captureDesignHistory();
  sketch.cornerRadii[designSketchSelectedIndex] = nextRadius;
  state.designDraft.sketch = sketch;
  state.designDraft.manualCode = false;
  syncDesignSelectedCornerField();
  syncDesignCode();
  renderDesignPreview({ fitView: false });
}

function syncDesignTempleSelectedCornerField() {
  const sketch = normalizeDesignTempleSketch(state.designDraft.templeSketch, state.designDraft.construction);
  designTempleSketchSelectedIndex = Math.max(0, Math.min(designTempleSketchSelectedIndex, sketch.points.length - 1));
  if (els.designTempleSelectedCornerLabel) els.designTempleSelectedCornerLabel.textContent = `Point ${designTempleSketchSelectedIndex + 1} radius`;
  if (els.designTempleSelectedCornerRadius) {
    setDesignSliderFieldValue(els.designTempleSelectedCornerRadius, sketch.cornerRadii[designTempleSketchSelectedIndex] || 0, "mm");
  }
}

function updateSelectedDesignTempleCorner(radius, options = {}) {
  const sketch = normalizeDesignTempleSketch(state.designDraft.templeSketch, state.designDraft.construction);
  const nextRadius = THREE.MathUtils.clamp(parseDesignNumber(radius, 0), 0, 12);
  if ((sketch.cornerRadii[designTempleSketchSelectedIndex] || 0) === nextRadius) return;
  if (options.capture !== false) captureDesignHistory();
  sketch.cornerRadii[designTempleSketchSelectedIndex] = nextRadius;
  state.designDraft.templeSketch = sketch;
  state.designDraft.manualCode = false;
  syncDesignTempleSelectedCornerField();
  syncDesignCode();
  renderDesignPreview({ fitView: false });
}

function syncDesignCode() {
  state.designDraft.style = normalizeDesignStyle(state.designDraft.style);
  state.designDraft.code = buildDesignScad(state.designDraft);
  if (els.designScadCode) els.designScadCode.value = state.designDraft.code;
}

function designFitWarnings() {
  const p = designGeometryParams(state.designDraft.params);
  const features = normalizeDesignFeatures(state.designDraft.features, state.designDraft.params);
  const construction = normalizeDesignConstruction(state.designDraft.construction);
  const style = normalizeDesignStyle(state.designDraft.style);
  const warnings = [];
  const frontLip = (features.extrude.depth - construction.lensSeatWidth) / 2 - construction.lensChannelOffset;
  const rearLip = (features.extrude.depth - construction.lensSeatWidth) / 2 + construction.lensChannelOffset;
  const effectiveCapture = designLensInsertExpansion(construction);
  const minimumLip = Math.min(frontLip, rearLip);
  const push = (title, detail, level = "review") => warnings.push({ title, detail, level });

  if (construction.lensSeatWidth < construction.lensThickness + 0.08) {
    push("Lens slot may be too tight", `${formatNumber(construction.lensSeatWidth)} mm slot for ${formatNumber(construction.lensThickness)} mm lens.`);
  }
  if (minimumLip < 0.45) {
    push("Lens channel lip is thin", `Front/rear lip is ${formatNumber(frontLip)} / ${formatNumber(rearLip)} mm.`);
  }
  if (effectiveCapture < 0.15) {
    push("Lens edge capture is low", `${formatNumber(effectiveCapture)} mm effective capture may not hold every lens.`);
  }
  if (p.rim_thickness < 3) {
    push("Rim is lightweight", `${formatNumber(p.rim_thickness)} mm rim may flex on difficult prints.`);
  }
  if (features.chamfer.enabled && features.chamfer.amount > Math.min(p.rim_thickness, features.extrude.depth) * 0.32) {
    push("Chamfer close to limit", `${formatNumber(features.chamfer.amount)} mm chamfer can visually eat thin geometry.`);
  }
  if (p.bridge_width < 14 || p.bridge_width > 26) {
    push("Bridge fit outside common range", `${formatNumber(p.bridge_width)} mm bridge should be test-fit before production.`);
  }
  if (construction.templeBarHeight < 4 || construction.templeDepth < 3.2) {
    push("Temple may flex", `${formatNumber(construction.templeBarHeight)} x ${formatNumber(construction.templeDepth)} mm profile is close to the minimum.`);
  }
  if (p.temple_length < 90) {
    push("Temple is short", `${formatNumber(p.temple_length)} mm may need a fit check on adult heads.`);
  }
  if (style.templeDetailMode === "text") {
    const label = longestTempleTextLabel(style);
    if (label) {
      const profile = normalizeDesignTempleSketch(state.designDraft.templeSketch, construction);
      const textBounds = designTempleTextBounds(construction, profile, label);
      if (textBounds.width > Math.max(8, textBounds.profileWidth - designTempleTextSafeStart - designTempleTextEndPadding)) {
        push("Temple text is long", "The label may reach into the hinge or hook area.");
      }
    }
  }
  return warnings;
}

function renderDesignFitWarnings() {
  if (!els.designWarnings) return;
  const warnings = designFitWarnings();
  if (!warnings.length) {
    els.designWarnings.innerHTML = `
      <article class="design-warning is-ok">
        <em>Ready</em>
        <strong>Geometry looks production-ready</strong>
        <small>No obvious lens, bridge or temple fit risks in the current settings.</small>
      </article>
    `;
    return;
  }
  els.designWarnings.innerHTML = warnings.slice(0, 5).map((warning) => `
    <article class="design-warning is-${escapeHtml(warning.level)}">
      <em>${escapeHtml(warning.level === "critical" ? "Fix" : "Check")}</em>
      <strong>${escapeHtml(warning.title)}</strong>
      <small>${escapeHtml(warning.detail)}</small>
    </article>
  `).join("");
}

function renderDesignProductionChecks() {
  if (!els.designProductionChecks) return;
  const p = designGeometryParams(state.designDraft.params);
  const features = normalizeDesignFeatures(state.designDraft.features, state.designDraft.params);
  const construction = normalizeDesignConstruction(state.designDraft.construction);
  const hingeReady = ["frontLeft", "frontRight", "templeLeft", "templeRight"].every((key) => Boolean(designHingeLibrary[key]));
  const frontLip = (features.extrude.depth - construction.lensSeatWidth) / 2 - construction.lensChannelOffset;
  const rearLip = (features.extrude.depth - construction.lensSeatWidth) / 2 + construction.lensChannelOffset;
  const effectiveCapture = designLensInsertExpansion(construction);
  const checks = [
    { label: "Hinge interface", value: hingeReady ? "FL-H1 ready" : "Files unavailable", ready: hingeReady },
    { label: "Lens channel", value: `${formatNumber(construction.lensSeatWidth)} mm / ${formatNumber(construction.lensClearance)} mm fit`, ready: construction.lensSeatWidth >= construction.lensThickness + 0.1 },
    { label: "Front / rear lip", value: `${formatNumber(frontLip)} / ${formatNumber(rearLip)} mm`, ready: Math.min(frontLip, rearLip) >= 0.45 },
    { label: "Edge capture", value: `${formatNumber(effectiveCapture)} mm effective`, ready: effectiveCapture >= 0.15 },
    { label: "Temple profile", value: `${formatNumber(construction.templeBarHeight)} x ${formatNumber(construction.templeDepth)} mm`, ready: construction.templeBarHeight >= 4 && construction.templeDepth >= 3.2 }
  ];
  els.designProductionChecks.innerHTML = checks.map((check) => `
    <div class="${check.ready ? "ready" : "review"}">
      <span>${escapeHtml(check.label)}</span>
      <strong>${escapeHtml(check.value)}</strong>
      <em>${check.ready ? "Ready" : "Review"}</em>
    </div>
  `).join("");
}

function switchDesignTab(mode) {
  const nextMode = ["front", "left-temple", "right-temple", "assembly"].includes(mode) ? mode : "front";
  state.designDraft.step = nextMode;
  els.designTabs.forEach((button) => {
    const active = button.dataset.designTab === nextMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  if (els.designOperationsPanel) els.designOperationsPanel.hidden = nextMode !== "front";
  if (els.designFeaturesPanel) els.designFeaturesPanel.hidden = nextMode !== "left-temple";
  if (els.designRightTemplePanel) els.designRightTemplePanel.hidden = nextMode !== "right-temple";
  if (els.designAssemblyPanel) els.designAssemblyPanel.hidden = nextMode !== "assembly";
  if (els.designCodePanel) els.designCodePanel.hidden = true;
  if (nextMode === "assembly") setDesignView("3d");
  else setDesignView("sketch");
}

function handleDesignProjectCopyChange() {
  state.designDraft.name = cleanText(els.designName?.value, "My custom frame", 120);
  state.designDraft.description = cleanText(els.designDescription?.value, "", 260);
}

function syncDesignDraftFromControlValues(options = {}) {
  handleDesignProjectCopyChange();
  const preserveManualCode = options.preserveManualCode === true;
  const wasManualCode = Boolean(state.designDraft.manualCode);
  const currentConstruction = normalizeDesignConstruction(state.designDraft.construction);
  const numberValue = (field, fallback) => field ? parseDesignNumber(field.value, fallback) : fallback;
  const checkboxValue = (field, fallback) => field ? Boolean(field.checked) : fallback;
  const nextBridgeThickness = THREE.MathUtils.clamp(
    numberValue(els.designBridgeThickness, currentConstruction.bridgeThickness),
    3,
    12
  );
  const currentBridgeMidpoint = (
    currentConstruction.bridgeTopJoinOffset + currentConstruction.bridgeBottomJoinOffset
  ) / 2;
  const nextConstructionInput = {
    ...state.designDraft.construction,
    lensSeatWidth: numberValue(els.designLensSlotWidth, currentConstruction.lensSeatWidth),
    lensSeatDepth: numberValue(els.designLensCaptureDepth, currentConstruction.lensSeatDepth),
    lensClearance: numberValue(els.designLensClearance, currentConstruction.lensClearance),
    lensChannelOffset: numberValue(els.designLensChannelOffset, currentConstruction.lensChannelOffset),
    hingeMountHeight: numberValue(els.designHingeMountHeight, currentConstruction.hingeMountHeight),
    hingeMountOffset: numberValue(els.designHingeMountOffset, currentConstruction.hingeMountOffset),
    bridgeThickness: nextBridgeThickness,
    bridgeBlendRadius: numberValue(els.designBridgeBlendRadius, currentConstruction.bridgeBlendRadius),
    bridgeTopJoinOffset: state.designDraft.construction?.bridgeTopJoinOffset,
    bridgeBottomJoinOffset: state.designDraft.construction?.bridgeBottomJoinOffset,
    noseWingHeight: numberValue(els.designNoseWingHeight, currentConstruction.noseWingHeight),
    noseWingAngle: numberValue(els.designNoseWingAngle, currentConstruction.noseWingAngle),
    noseWingRound: numberValue(els.designNoseWingRound, currentConstruction.noseWingTopRound),
    noseWingTopRound: numberValue(els.designNoseWingRound, currentConstruction.noseWingTopRound),
    noseWingBaseRound: numberValue(els.designNoseWingBaseRound, currentConstruction.noseWingBaseRound),
    topVisorEnabled: checkboxValue(els.designTopVisorEnabled, currentConstruction.topVisorEnabled),
    topVisorDepth: numberValue(els.designTopVisorDepth, currentConstruction.topVisorDepth),
    topVisorBandHeight: numberValue(els.designTopVisorBandHeight, currentConstruction.topVisorBandHeight),
    topVisorRadius: numberValue(els.designTopVisorRadius, currentConstruction.topVisorRadius),
    topVisorStartX: currentConstruction.topVisorStartX,
    topVisorEndX: currentConstruction.topVisorEndX,
    templeStraight: numberValue(els.designTempleStraight, currentConstruction.templeStraight),
    templeHook: numberValue(els.designTempleHook, currentConstruction.templeHook),
    templeHookAngle: numberValue(els.designTempleHookAngle, currentConstruction.templeHookAngle),
    templeBarHeight: numberValue(els.designTempleBarHeight, currentConstruction.templeBarHeight),
    templeDepth: numberValue(els.designTempleDepth, currentConstruction.templeDepth),
    templeCornerRadius: numberValue(els.designTempleCornerRadius, currentConstruction.templeCornerRadius),
    templeChamferEnabled: checkboxValue(els.designTempleChamferEnabled, currentConstruction.templeChamferEnabled),
    templeChamferAmount: numberValue(els.designTempleChamferAmount, currentConstruction.templeChamferAmount),
    templeTextureDepth: numberValue(els.designTempleTextureDepth, currentConstruction.templeTextureDepth),
    templePatternStart: numberValue(els.designTemplePatternStart, currentConstruction.templePatternStart),
    templePatternEnd: numberValue(els.designTemplePatternEnd, currentConstruction.templePatternEnd),
    templePatternSpacing: numberValue(els.designTemplePatternSpacing, currentConstruction.templePatternSpacing),
    templePatternSize: numberValue(els.designTemplePatternSize, currentConstruction.templePatternSize),
    templeTextSize: numberValue(els.designTempleTextSize, currentConstruction.templeTextSize),
    templeTextPosition: numberValue(els.designTempleTextPosition, currentConstruction.templeTextPosition),
    templeTextYOffset: currentConstruction.templeTextYOffset,
    templeTextDepth: numberValue(els.designTempleTextDepth, currentConstruction.templeTextDepth)
  };
  if (Math.abs(nextBridgeThickness - currentConstruction.bridgeThickness) > 0.0001) {
    nextConstructionInput.bridgeTopJoinOffset = currentBridgeMidpoint + nextBridgeThickness / 2;
    nextConstructionInput.bridgeBottomJoinOffset = currentBridgeMidpoint - nextBridgeThickness / 2;
  }
  state.designDraft.construction = normalizeDesignConstruction(nextConstructionInput);
  state.designDraft.params.temple_length = state.designDraft.construction.templeStraight + state.designDraft.construction.templeHook;
  const nextLeftTempleText = els.designTempleText?.value || "";
  const nextRightTempleText = els.designRightTempleText?.value || "";
  let nextTempleDetailMode = els.designTempleDetailMode?.value || state.designDraft.style.templeDetailMode;
  if (nextLeftTempleText.trim() || nextRightTempleText.trim()) nextTempleDetailMode = "text";
  state.designDraft.style = normalizeDesignStyle({
    ...state.designDraft.style,
    lensShape: els.designLensShape?.value || state.designDraft.style.lensShape,
    templeDetailMode: nextTempleDetailMode,
    templePattern: els.designTemplePattern?.value || state.designDraft.style.templePattern,
    templeText: nextLeftTempleText,
    leftTempleText: nextLeftTempleText,
    rightTempleText: nextRightTempleText,
    browBar: false,
    frameColor: els.designFrameColor?.value || state.designDraft.style.frameColor,
    templeColor: els.designTempleColor?.value || state.designDraft.style.templeColor,
    lensColor: els.designLensColor?.value || state.designDraft.style.lensColor,
    detailColor: els.designDetailColor?.value || state.designDraft.style.detailColor,
    frameOpacity: Number(els.designFrameOpacity?.value) / 100,
    templeOpacity: Number(els.designTempleOpacity?.value) / 100,
    lensOpacity: Number(els.designLensOpacity?.value) / 100
  });
  state.designDraft.construction = normalizeDesignTempleTextPlacement(
    state.designDraft.construction,
    state.designDraft.templeSketch,
    state.designDraft.style
  );
  const currentFeatures = normalizeDesignFeatures(state.designDraft.features, state.designDraft.params);
  const nextChamferAmount = numberValue(els.designChamferAmount, currentFeatures.chamfer.enabled ? currentFeatures.chamfer.amount : 0);
  const nextFilletRadius = numberValue(els.designFilletRadius, currentFeatures.fillet.enabled ? currentFeatures.fillet.radius : 0);
  state.designDraft.features = normalizeDesignFeatures({
    extrude: { depth: numberValue(els.designExtrudeDepth, currentFeatures.extrude.depth) },
    fillet: { enabled: nextFilletRadius > 0.001, radius: nextFilletRadius },
    chamfer: { enabled: nextChamferAmount > 0.001, amount: nextChamferAmount },
    lensRecess: {
      enabled: checkboxValue(els.designLensRecessEnabled, currentFeatures.lensRecess.enabled),
      depth: numberValue(els.designLensRecessDepth, currentFeatures.lensRecess.depth)
    }
  }, state.designDraft.params);
  state.designDraft.params.frame_depth = state.designDraft.features.extrude.depth;
  state.designDraft.params.bevel = state.designDraft.features.chamfer.enabled
    ? state.designDraft.features.chamfer.amount
    : state.designDraft.features.fillet.enabled ? state.designDraft.features.fillet.radius : 0;
  state.designDraft.manualCode = preserveManualCode ? wasManualCode : false;
  if (!state.designDraft.manualCode) syncDesignCode();
}

function handleDesignOperationChange(event) {
  if (event.target === els.designSelectedCornerRadius) {
    captureDesignHistoryFromEvent(event);
    updateSelectedDesignCorner(event.target.value, { capture: false });
    setDesignNote("");
    return;
  }
  if (event.target === els.designTempleSelectedCornerRadius) {
    captureDesignHistoryFromEvent(event);
    updateSelectedDesignTempleCorner(event.target.value, { capture: false });
    setDesignNote("");
    return;
  }
  const liveBridgeControls = [
    els.designBridgeThickness,
    els.designBridgeBlendRadius
  ];
  if (
    event.type === "input"
    && event.target.matches('input[type="number"], input[type="text"], textarea')
    && !liveBridgeControls.includes(event.target)
    && ![els.designTempleText, els.designRightTempleText].includes(event.target)
  ) return;
  captureDesignHistoryFromEvent(event);
  const param = event.target.dataset.designParam;
  if (param) {
    state.designDraft.params[param] = parseDesignNumber(event.target.value, state.designDraft.params[param]);
    const unit = findParam(param)?.[6] || "";
    const output = document.querySelector(`#design-${param}-output`);
    if (output) output.textContent = formatValue(event.target.value, unit);
  }
  const publicParam = event.target.dataset.publicDesignParam;
  if (publicParam) {
    const selected = new Set(normalizeDesignPublicParameters(state.designDraft.publicParameters));
    if (event.target.checked) selected.add(publicParam);
    else selected.delete(publicParam);
    state.designDraft.publicParameters = normalizeDesignPublicParameters([...selected]);
    event.target.closest(".design-public-item")?.classList.toggle("active", event.target.checked);
  }
  const rangeParam = event.target.dataset.publicRangeParam;
  if (rangeParam) {
    state.designDraft.sliderRanges = normalizeDesignSliderRanges({
      ...state.designDraft.sliderRanges,
      [rangeParam]: {
        ...state.designDraft.sliderRanges?.[rangeParam],
        [event.target.dataset.publicRangeBound]: parseDesignNumber(
          event.target.value,
          state.designDraft.sliderRanges?.[rangeParam]?.[event.target.dataset.publicRangeBound]
        )
      }
    });
  }
  if ([
    els.designLensSlotWidth,
    els.designLensCaptureDepth,
    els.designLensClearance,
    els.designLensChannelOffset,
    els.designHingeMountHeight,
    els.designHingeMountOffset,
    els.designBridgeThickness,
    els.designBridgeBlendRadius,
    els.designNoseWingHeight,
    els.designNoseWingAngle,
    els.designNoseWingRound,
    els.designNoseWingBaseRound,
    els.designTopVisorEnabled,
    els.designTopVisorDepth,
    els.designTopVisorBandHeight,
    els.designTopVisorRadius,
    els.designTempleStraight,
    els.designTempleHook,
    els.designTempleHookAngle,
    els.designTempleBarHeight,
    els.designTempleDepth,
    els.designTempleCornerRadius,
    els.designTempleChamferEnabled,
    els.designTempleChamferAmount,
    els.designTempleTextureDepth,
    els.designTemplePatternStart,
    els.designTemplePatternEnd,
    els.designTemplePatternSpacing,
    els.designTemplePatternSize,
    els.designTempleTextSize,
    els.designTempleTextPosition,
    els.designTempleTextDepth
  ].includes(event.target)) {
    const currentConstruction = normalizeDesignConstruction(state.designDraft.construction);
    const templeShapeControls = [
      els.designTempleStraight,
      els.designTempleHook,
      els.designTempleHookAngle,
      els.designTempleBarHeight
    ];
    const shouldRegenerateTempleSketch = templeShapeControls.includes(event.target)
      && designTempleSketchMatchesConstruction(state.designDraft.templeSketch, currentConstruction);
    const nextBridgeThickness = THREE.MathUtils.clamp(
      parseDesignNumber(els.designBridgeThickness?.value, currentConstruction.bridgeThickness),
      3,
      12
    );
    const currentBridgeMidpoint = (currentConstruction.bridgeTopJoinOffset + currentConstruction.bridgeBottomJoinOffset) / 2;
    const nextConstructionInput = {
      ...state.designDraft.construction,
      lensSeatWidth: els.designLensSlotWidth?.value,
      lensSeatDepth: els.designLensCaptureDepth?.value,
      lensClearance: els.designLensClearance?.value,
      lensChannelOffset: els.designLensChannelOffset?.value,
      hingeMountHeight: els.designHingeMountHeight?.value,
      hingeMountOffset: els.designHingeMountOffset?.value,
      bridgeThickness: nextBridgeThickness,
      bridgeBlendRadius: els.designBridgeBlendRadius?.value,
      bridgeTopJoinOffset: state.designDraft.construction?.bridgeTopJoinOffset,
      bridgeBottomJoinOffset: state.designDraft.construction?.bridgeBottomJoinOffset,
      noseWingHeight: els.designNoseWingHeight?.value,
      noseWingAngle: els.designNoseWingAngle?.value,
      noseWingRound: els.designNoseWingRound?.value,
      noseWingTopRound: els.designNoseWingRound?.value,
      noseWingBaseRound: els.designNoseWingBaseRound?.value,
      topVisorEnabled: els.designTopVisorEnabled?.checked,
      topVisorDepth: els.designTopVisorDepth?.value,
      topVisorBandHeight: els.designTopVisorBandHeight?.value,
      topVisorRadius: els.designTopVisorRadius?.value,
      topVisorStartX: currentConstruction.topVisorStartX,
      topVisorEndX: currentConstruction.topVisorEndX,
      templeStraight: els.designTempleStraight?.value,
      templeHook: els.designTempleHook?.value,
      templeHookAngle: els.designTempleHookAngle?.value,
      templeBarHeight: els.designTempleBarHeight?.value,
      templeDepth: els.designTempleDepth?.value,
      templeCornerRadius: els.designTempleCornerRadius?.value,
      templeChamferEnabled: els.designTempleChamferEnabled?.checked,
      templeChamferAmount: els.designTempleChamferAmount?.value,
      templeTextureDepth: els.designTempleTextureDepth?.value,
      templePatternStart: els.designTemplePatternStart?.value,
      templePatternEnd: els.designTemplePatternEnd?.value,
      templePatternSpacing: els.designTemplePatternSpacing?.value,
      templePatternSize: els.designTemplePatternSize?.value,
      templeTextSize: els.designTempleTextSize?.value,
      templeTextPosition: els.designTempleTextPosition?.value,
      templeTextDepth: els.designTempleTextDepth?.value
    };
    if (event.target === els.designBridgeThickness) {
      nextConstructionInput.bridgeTopJoinOffset = currentBridgeMidpoint + nextBridgeThickness / 2;
      nextConstructionInput.bridgeBottomJoinOffset = currentBridgeMidpoint - nextBridgeThickness / 2;
    }
    state.designDraft.construction = normalizeDesignConstruction(nextConstructionInput);
    state.designDraft.params.temple_length = state.designDraft.construction.templeStraight + state.designDraft.construction.templeHook;
    if (shouldRegenerateTempleSketch) {
      state.designDraft.templeSketch = designTempleProfileFromConstruction(state.designDraft.construction);
      designTempleSketchSelectedIndex = 0;
    }
  }
  const nextChamferAmount = parseDesignNumber(els.designChamferAmount?.value, 0);
  const nextFilletRadius = parseDesignNumber(els.designFilletRadius?.value, 0);
  const features = normalizeDesignFeatures({
    extrude: { depth: els.designExtrudeDepth?.value },
    fillet: { enabled: nextFilletRadius > 0.001, radius: nextFilletRadius },
    chamfer: { enabled: nextChamferAmount > 0.001, amount: nextChamferAmount },
    lensRecess: { enabled: els.designLensRecessEnabled?.checked, depth: els.designLensRecessDepth?.value }
  }, state.designDraft.params);
  state.designDraft.features = features;
  state.designDraft.params.frame_depth = features.extrude.depth;
  state.designDraft.params.bevel = features.chamfer.enabled ? features.chamfer.amount : features.fillet.enabled ? features.fillet.radius : 0;
  if (event.target === els.designLensShape) {
    state.designDraft.sketch = { symmetric: true, ...designProfilePreset(els.designLensShape.value) };
    designSketchSelectedIndex = 0;
  }
  const nextLeftTempleText = els.designTempleText?.value || "";
  const nextRightTempleText = els.designRightTempleText?.value || "";
  let nextTempleDetailMode = els.designTempleDetailMode?.value || state.designDraft.style.templeDetailMode;
  if ([els.designTempleText, els.designRightTempleText].includes(event.target)) {
    nextTempleDetailMode = nextLeftTempleText.trim() || nextRightTempleText.trim()
      ? "text"
      : nextTempleDetailMode === "text" ? "none" : nextTempleDetailMode;
  }
  state.designDraft.style = normalizeDesignStyle({
    ...state.designDraft.style,
    lensShape: els.designLensShape?.value || state.designDraft.style.lensShape,
    templeDetailMode: nextTempleDetailMode,
    templePattern: els.designTemplePattern?.value,
    templeText: nextLeftTempleText,
    leftTempleText: nextLeftTempleText,
    rightTempleText: nextRightTempleText,
    browBar: false,
    frameColor: els.designFrameColor?.value,
    templeColor: els.designTempleColor?.value,
    lensColor: els.designLensColor?.value,
    detailColor: els.designDetailColor?.value,
    frameOpacity: Number(els.designFrameOpacity?.value) / 100,
    templeOpacity: Number(els.designTempleOpacity?.value) / 100,
    lensOpacity: Number(els.designLensOpacity?.value) / 100
  });
  state.designDraft.construction = normalizeDesignTempleTextPlacement(
    state.designDraft.construction,
    state.designDraft.templeSketch,
    state.designDraft.style
  );
  state.designDraft.manualCode = false;
  syncDesignFields();
  syncDesignCode();
  renderDesignProductionChecks();
  renderDesignPreview({ fitView: false });
  setDesignNote("");
}

function designProfilePreset(shape) {
  if (shape === "round") {
    const points = Array.from({ length: 12 }, (_, index) => {
      const angle = Math.PI / 2 - index * Math.PI * 2 / 12;
      return [Math.cos(angle) * 0.5, Math.sin(angle) * 0.5];
    });
    return { points, cornerRadii: Array.from({ length: points.length }, () => 2) };
  }
  if (shape === "sharp") {
    const points = [[-0.48, 0.5], [0.48, 0.5], [0.5, 0.34], [0.45, -0.5], [-0.43, -0.5], [-0.5, 0.31]];
    return { points, cornerRadii: Array.from({ length: points.length }, () => 0) };
  }
  return { points: structuredClone(defaultDesignSketchPoints), cornerRadii: structuredClone(defaultDesignSketchRadii) };
}

function addDesignSketchPoint() {
  if (isDesignBridgeSelection(designSketchSelectedIndex) || isDesignNoseWingSelection(designSketchSelectedIndex)) {
    setDesignNote("Select a front outline point to add another profile point.");
    return;
  }
  const sketch = normalizeDesignSketch(state.designDraft.sketch);
  if (sketch.points.length >= 20) return;
  captureDesignHistory();
  const index = Math.min(sketch.points.length - 1, Math.max(0, designSketchSelectedIndex));
  const nextIndex = (index + 1) % sketch.points.length;
  const first = sketch.points[index];
  const second = sketch.points[nextIndex];
  const point = [(first[0] + second[0]) / 2, (first[1] + second[1]) / 2];
  sketch.points.splice(nextIndex, 0, point);
  sketch.cornerRadii.splice(nextIndex, 0, 0);
  state.designDraft.sketch = sketch;
  designSketchSelectedIndex = nextIndex;
  state.designDraft.manualCode = false;
  syncDesignSelectedCornerField();
  syncDesignCode();
  renderDesignPreview({ fitView: false });
}

function removeDesignSketchPoint() {
  if (isDesignBridgeSelection(designSketchSelectedIndex) || isDesignNoseWingSelection(designSketchSelectedIndex)) {
    setDesignNote("Select a front outline point to remove it.");
    return;
  }
  const sketch = normalizeDesignSketch(state.designDraft.sketch);
  if (sketch.points.length <= 4) {
    setDesignNote("A closed profile needs at least four points.");
    return;
  }
  captureDesignHistory();
  sketch.points.splice(Math.min(designSketchSelectedIndex, sketch.points.length - 1), 1);
  sketch.cornerRadii.splice(Math.min(designSketchSelectedIndex, sketch.cornerRadii.length - 1), 1);
  designSketchSelectedIndex = Math.max(0, Math.min(designSketchSelectedIndex, sketch.points.length - 1));
  state.designDraft.sketch = sketch;
  state.designDraft.manualCode = false;
  syncDesignSelectedCornerField();
  syncDesignCode();
  renderDesignPreview({ fitView: false });
}

function addDesignTempleSketchPoint() {
  const sketch = normalizeDesignTempleSketch(state.designDraft.templeSketch, state.designDraft.construction);
  if (sketch.points.length >= 24) return;
  captureDesignHistory();
  const index = Math.min(sketch.points.length - 1, Math.max(0, designTempleSketchSelectedIndex));
  const nextIndex = (index + 1) % sketch.points.length;
  const first = sketch.points[index];
  const second = sketch.points[nextIndex];
  sketch.points.splice(nextIndex, 0, [(first[0] + second[0]) / 2, (first[1] + second[1]) / 2]);
  sketch.cornerRadii.splice(nextIndex, 0, 0);
  state.designDraft.templeSketch = sketch;
  designTempleSketchSelectedIndex = nextIndex;
  state.designDraft.manualCode = false;
  syncDesignTempleSelectedCornerField();
  syncDesignCode();
  renderDesignPreview({ fitView: false });
}

function removeDesignTempleSketchPoint() {
  const sketch = normalizeDesignTempleSketch(state.designDraft.templeSketch, state.designDraft.construction);
  if (sketch.points.length <= 4) {
    setDesignNote("A closed temple profile needs at least four points.");
    return;
  }
  captureDesignHistory();
  sketch.points.splice(designTempleSketchSelectedIndex, 1);
  sketch.cornerRadii.splice(designTempleSketchSelectedIndex, 1);
  designTempleSketchSelectedIndex = Math.max(0, Math.min(designTempleSketchSelectedIndex, sketch.points.length - 1));
  state.designDraft.templeSketch = sketch;
  state.designDraft.manualCode = false;
  syncDesignTempleSelectedCornerField();
  syncDesignCode();
  renderDesignPreview({ fitView: false });
}

function parseDesignCode(source) {
  const style = { ...state.designDraft.style };
  const legacyTextValue = source.match(/(?:^|\n)\s*temple_text\s*=\s*"([^"]*)"\s*;/)?.[1];
  const leftTextValue = source.match(/(?:^|\n)\s*left_temple_text\s*=\s*"([^"]*)"\s*;/)?.[1] ?? legacyTextValue;
  const rightTextValue = source.match(/(?:^|\n)\s*right_temple_text\s*=\s*"([^"]*)"\s*;/)?.[1] ?? legacyTextValue;
  const detailModeValue = source.match(/(?:^|\n)\s*temple_detail_mode\s*=\s*"([^"]*)"\s*;/)?.[1];
  const patternValue = source.match(/(?:^|\n)\s*temple_pattern\s*=\s*"([^"]*)"\s*;/)?.[1];
  const shapeValue = source.match(/(?:^|\n)\s*lens_shape\s*=\s*"([^"]*)"\s*;/)?.[1];
  const browValue = source.match(/(?:^|\n)\s*brow_bar_enabled\s*=\s*(true|false)\s*;/)?.[1];
  const colorValues = {
    frameColor: source.match(/(?:^|\n)\s*(?:front_color|frame_color)\s*=\s*"(#[0-9a-fA-F]{6})"\s*;/)?.[1],
    templeColor: source.match(/(?:^|\n)\s*temple_color\s*=\s*"(#[0-9a-fA-F]{6})"\s*;/)?.[1],
    lensColor: source.match(/(?:^|\n)\s*lens_color\s*=\s*"(#[0-9a-fA-F]{6})"\s*;/)?.[1],
    detailColor: source.match(/(?:^|\n)\s*detail_color\s*=\s*"(#[0-9a-fA-F]{6})"\s*;/)?.[1]
  };
  const profileSource = source.match(/(?:^|\n)\s*profile_points\s*=\s*\[([\s\S]*?)\]\s*;/)?.[1] || "";
  const parsedPoints = [...profileSource.matchAll(/\[\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\]/g)]
    .map((match) => [Number(match[1]), Number(match[2])]);
  const cornerRadiusSource = source.match(/(?:^|\n)\s*profile_corner_radii\s*=\s*\[([\s\S]*?)\]\s*;/)?.[1] || "";
  const parsedCornerRadii = [...cornerRadiusSource.matchAll(/-?\d*\.?\d+/g)].map((match) => Number(match[0]));
  const templeProfileSource = source.match(/(?:^|\n)\s*temple_profile_points\s*=\s*\[([\s\S]*?)\]\s*;/)?.[1] || "";
  const parsedTemplePoints = [...templeProfileSource.matchAll(/\[\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\]/g)]
    .map((match) => [Number(match[1]), Number(match[2])]);
  const templeCornerRadiusSource = source.match(/(?:^|\n)\s*temple_profile_corner_radii\s*=\s*\[([\s\S]*?)\]\s*;/)?.[1] || "";
  const parsedTempleCornerRadii = [...templeCornerRadiusSource.matchAll(/-?\d*\.?\d+/g)].map((match) => Number(match[0]));
  const publicSource = source.match(/(?:^|\n)\s*customer_sliders\s*=\s*\[([\s\S]*?)\]\s*;/)?.[1] || "";
  const publicParameters = [...publicSource.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  const rangeSource = source.match(/(?:^|\n)\s*customer_slider_ranges\s*=\s*\[([\s\S]*?)\]\s*;/)?.[1] || "";
  const sliderRanges = Object.fromEntries([...rangeSource.matchAll(/\[\s*"([^"]+)"\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)/g)]
    .map((match) => [match[1], { min: Number(match[2]), max: Number(match[3]) }]));
  const readBool = (key, fallback) => {
    const value = source.match(new RegExp(`(?:^|\\n)\\s*${key}\\s*=\\s*(true|false)\\s*;`))?.[1];
    return value === undefined ? fallback : value === "true";
  };
  const readNumber = (key, fallback) => {
    const value = source.match(new RegExp(`(?:^|\\n)\\s*${key}\\s*=\\s*(-?\\d*\\.?\\d+)\\s*;`))?.[1];
    return value === undefined ? fallback : Number(value);
  };
  const currentFeatures = normalizeDesignFeatures(state.designDraft.features, state.designDraft.params);
  const parsedNoseWingRound = readNumber("nose_wing_round", state.designDraft.construction?.noseWingRound);
  return {
    params: { ...state.designDraft.params, ...parseScadParameters(source) },
    sketch: normalizeDesignSketch({
      points: parsedPoints.length >= 4 ? parsedPoints : state.designDraft.sketch.points,
      cornerRadii: parsedCornerRadii.length ? parsedCornerRadii : state.designDraft.sketch.cornerRadii
    }),
    templeSketch: normalizeDesignTempleSketch({
      points: parsedTemplePoints.length >= 4 ? parsedTemplePoints : state.designDraft.templeSketch?.points,
      cornerRadii: parsedTempleCornerRadii.length ? parsedTempleCornerRadii : state.designDraft.templeSketch?.cornerRadii
    }, state.designDraft.construction),
    publicParameters: normalizeDesignPublicParameters(publicParameters.length ? publicParameters : state.designDraft.publicParameters),
    sliderRanges: normalizeDesignSliderRanges(Object.keys(sliderRanges).length ? sliderRanges : state.designDraft.sliderRanges),
    construction: normalizeDesignConstruction({
      ...state.designDraft.construction,
      lensSeatWidth: readNumber("lens_seat_width", state.designDraft.construction?.lensSeatWidth),
      lensSeatDepth: readNumber("lens_seat_depth", state.designDraft.construction?.lensSeatDepth),
      lensClearance: readNumber("lens_clearance", state.designDraft.construction?.lensClearance),
      lensChannelOffset: readNumber("lens_channel_offset", state.designDraft.construction?.lensChannelOffset),
      hingeMountHeight: readNumber("hinge_mount_height", state.designDraft.construction?.hingeMountHeight),
      hingeMountOffset: readNumber("hinge_mount_offset", state.designDraft.construction?.hingeMountOffset),
      bridgeThickness: readNumber("bridge_thickness", state.designDraft.construction?.bridgeThickness),
      bridgeBlendRadius: readNumber("bridge_blend_radius", state.designDraft.construction?.bridgeBlendRadius),
      bridgeTopJoinOffset: readNumber("bridge_top_join_offset", state.designDraft.construction?.bridgeTopJoinOffset),
      bridgeBottomJoinOffset: readNumber("bridge_bottom_join_offset", state.designDraft.construction?.bridgeBottomJoinOffset),
      noseWingHeight: readNumber("nose_wing_height", state.designDraft.construction?.noseWingHeight),
      noseWingAngle: readNumber("nose_wing_angle", state.designDraft.construction?.noseWingAngle),
      noseWingRound: parsedNoseWingRound,
      noseWingTopRound: readNumber("nose_wing_top_round", parsedNoseWingRound),
      noseWingBaseRound: readNumber("nose_wing_base_round", parsedNoseWingRound),
      noseWingTopOffset: readNumber("nose_wing_top_offset", state.designDraft.construction?.noseWingTopOffset),
      noseWingBottomOffset: readNumber("nose_wing_bottom_offset", state.designDraft.construction?.noseWingBottomOffset),
      noseWingTopShift: readNumber("nose_wing_top_shift", state.designDraft.construction?.noseWingTopShift),
      noseWingBottomShift: readNumber("nose_wing_bottom_shift", state.designDraft.construction?.noseWingBottomShift),
      noseWingTopOuterOffset: readNumber("nose_wing_top_outer_offset", state.designDraft.construction?.noseWingTopOuterOffset),
      noseWingTopInnerOffset: readNumber("nose_wing_top_inner_offset", state.designDraft.construction?.noseWingTopInnerOffset),
      noseWingBottomInnerOffset: readNumber("nose_wing_bottom_inner_offset", state.designDraft.construction?.noseWingBottomInnerOffset),
      noseWingBottomOuterOffset: readNumber("nose_wing_bottom_outer_offset", state.designDraft.construction?.noseWingBottomOuterOffset),
      topVisorEnabled: readBool("top_visor_enabled", state.designDraft.construction?.topVisorEnabled),
      topVisorDepth: readNumber("top_visor_depth", state.designDraft.construction?.topVisorDepth),
      topVisorBandHeight: readNumber("top_visor_band_height", state.designDraft.construction?.topVisorBandHeight),
      topVisorRadius: readNumber("top_visor_radius", state.designDraft.construction?.topVisorRadius),
      topVisorStartX: readNumber("top_visor_start_x", state.designDraft.construction?.topVisorStartX),
      topVisorEndX: readNumber("top_visor_end_x", state.designDraft.construction?.topVisorEndX),
      templeStraight: readNumber("temple_straight", state.designDraft.construction?.templeStraight),
      templeHook: readNumber("temple_hook", state.designDraft.construction?.templeHook),
      templeHookAngle: readNumber("temple_hook_angle", state.designDraft.construction?.templeHookAngle),
      templeBarHeight: readNumber("temple_bar_height", state.designDraft.construction?.templeBarHeight),
      templeDepth: readNumber("temple_depth", state.designDraft.construction?.templeDepth),
      templeCornerRadius: readNumber("temple_corner_radius", state.designDraft.construction?.templeCornerRadius),
      templeChamferEnabled: readBool("temple_chamfer_enabled", state.designDraft.construction?.templeChamferEnabled),
      templeChamferAmount: readNumber("temple_chamfer_amount", state.designDraft.construction?.templeChamferAmount),
      templeTextureDepth: readNumber("temple_texture_depth", state.designDraft.construction?.templeTextureDepth),
      templePatternStart: readNumber("temple_pattern_start", state.designDraft.construction?.templePatternStart),
      templePatternEnd: readNumber("temple_pattern_end", state.designDraft.construction?.templePatternEnd),
      templePatternSpacing: readNumber("temple_pattern_spacing", state.designDraft.construction?.templePatternSpacing),
      templePatternSize: readNumber("temple_pattern_size", state.designDraft.construction?.templePatternSize),
      templeTextSize: readNumber("temple_text_size", state.designDraft.construction?.templeTextSize),
      templeTextPosition: readNumber("temple_text_position", state.designDraft.construction?.templeTextPosition),
      templeTextYOffset: readNumber("temple_text_y_offset", state.designDraft.construction?.templeTextYOffset),
      templeTextDepth: readNumber("temple_text_depth", state.designDraft.construction?.templeTextDepth)
    }),
    features: normalizeDesignFeatures({
      extrude: {
        enabled: true,
        depth: readNumber("extrude_depth", currentFeatures.extrude.depth)
      },
      fillet: {
        enabled: readBool("fillet_enabled", currentFeatures.fillet.enabled),
        radius: readNumber("fillet_radius", currentFeatures.fillet.radius)
      },
      chamfer: {
        enabled: readBool("chamfer_enabled", currentFeatures.chamfer.enabled),
        amount: readNumber("chamfer_amount", currentFeatures.chamfer.amount)
      },
      lensRecess: {
        enabled: readBool("lens_recess_enabled", currentFeatures.lensRecess.enabled),
        depth: readNumber("lens_recess_depth", currentFeatures.lensRecess.depth)
      }
    }, state.designDraft.params),
    style: normalizeDesignStyle({
      ...style,
      templeText: leftTextValue === undefined ? style.templeText : leftTextValue,
      leftTempleText: leftTextValue === undefined ? style.leftTempleText : leftTextValue,
      rightTempleText: rightTextValue === undefined ? style.rightTempleText : rightTextValue,
      templeDetailMode: detailModeValue || style.templeDetailMode,
      templePattern: patternValue || style.templePattern,
      lensShape: shapeValue || style.lensShape,
      browBar: browValue === undefined ? style.browBar : browValue === "true",
      ...colorValues
    })
  };
}

function applyDesignCode() {
  const source = String(els.designScadCode?.value || "").trim();
  if (!source) {
    setDesignNote("Enter OpenSCAD code before applying.");
    return;
  }
  captureDesignHistory();
  const parsed = parseDesignCode(source);
  state.designDraft.params = parsed.params;
  state.designDraft.style = parsed.style;
  state.designDraft.sketch = parsed.sketch;
  state.designDraft.templeSketch = parsed.templeSketch || designTempleProfileFromConstruction(parsed.construction);
  state.designDraft.features = parsed.features;
  state.designDraft.construction = parsed.construction;
  state.designDraft.publicParameters = parsed.publicParameters;
  state.designDraft.sliderRanges = parsed.sliderRanges;
  state.designDraft.params.temple_length = parsed.construction.templeStraight + parsed.construction.templeHook;
  state.designDraft.params.frame_depth = parsed.features.extrude.depth;
  state.designDraft.params.bevel = parsed.features.chamfer.enabled
    ? parsed.features.chamfer.amount
    : parsed.features.fillet.enabled ? parsed.features.fillet.radius : 0;
  state.designDraft.code = source;
  state.designDraft.manualCode = true;
  buildDesignControls();
  renderDesignPreview({ fitView: false });
  setDesignNote("Supported OpenSCAD parameters applied to the preview. Custom code is kept in the submitted file.");
}

function resetDesignDraft(options = {}) {
  if (options.capture) captureDesignHistory();
  else resetDesignHistory();
  state.designDraft = createDefaultDesignDraft();
  designSketchSelectedIndex = 0;
  designTempleSketchSelectedIndex = 0;
  clearDesignMeasurement(false);
  buildDesignControls();
  switchDesignTab("front");
  setDesignView("sketch");
  renderDesignPreview({ fitView: true });
  setDesignNote("New design ready.");
  updateDesignHistoryControls();
}

async function exportDesignScad() {
  syncDesignDraftFromControlValues({ preserveManualCode: true });
  const source = state.designDraft.manualCode ? els.designScadCode.value : buildDesignScad(state.designDraft);
  const projectRoot = slugify(state.designDraft.name) || "frame-lab-design";
  const files = { [`${projectRoot}.scad`]: strToU8(source) };

  try {
    await Promise.all(
      Object.values(designHingeAssetManifest).map(async (assetUrl) => {
        const response = await fetch(assetUrl);
        if (!response.ok) throw new Error(`Could not include ${assetUrl}.`);
        files[assetUrl.replace(/^\.\//, "")] = new Uint8Array(await response.arrayBuffer());
      })
    );
    const bundle = zipSync(files);
    downloadBlob(`${projectRoot}-design-kit.zip`, new Blob([bundle], { type: "application/zip" }));
    setDesignNote("OpenSCAD project kit downloaded with the production hinge library.");
  } catch (error) {
    downloadText(`${projectRoot}.scad`, source, "application/scad");
    setDesignNote("Source downloaded. The hinge library could not be included.");
  }
}

async function exportDesign3mf() {
  syncDesignDraftFromControlValues({ preserveManualCode: true });
  if (!(await ensureDownloadAllowed(null))) return;
  showLoader(true, "Generating Creator 3MF", "Packing separate front, lens and temple production files...");
  await waitFrame();
  try {
    renderDesignPreview({ fitView: false });
    await waitFrame();
    if (!designModelGroup) throw new Error("Creator preview is not ready.");
    const projectRoot = slugify(state.designDraft.name) || "frame-lab-creator";
    const parts = buildDesign3mfExportParts(projectRoot);
    const missing = parts.filter((part) => !part.mesh.triangles.length).map((part) => part.label);
    if (missing.length) throw new Error(`No geometry for: ${missing.join(", ")}.`);
    const totals = meshExportCounts(parts.map((part) => part.mesh));
    const fileName = `${projectRoot}-3mf-parts.zip`;
    const saved = await recordDesignDownload(fileName, totals);
    if (!saved) return;
    const files = Object.fromEntries(parts.map((part) => [
      `${projectRoot}/${part.fileName}`,
      make3mfBytes(part.mesh, { title: part.title, lens: part.lens })
    ]));
    const laserFileName = `laser/${projectRoot}-lenses-for-laser.svg`;
    files[`${projectRoot}/${laserFileName}`] = strToU8(buildDesignLensesLaserSvg(projectRoot, designDefinitionFromDraft()));
    files[`${projectRoot}/manifest.json`] = strToU8(JSON.stringify({
      project: state.designDraft.name || "Frame Lab Creator",
      exportedAt: new Date().toISOString(),
      format: "Frame Lab Creator split 3MF package",
      laser: {
        fileName: laserFileName,
        units: "millimeter",
        process: "line cutting"
      },
      parts: parts.map((part) => ({
        id: part.id,
        fileName: part.fileName,
        triangles: part.mesh.triangles.length,
        vertices: part.mesh.vertices.length
      }))
    }, null, 2));
    downloadBlob(fileName, new Blob([zipSync(files)], { type: "application/zip" }));
    setDesignNote(`3MF parts exported with lens laser SVG: front, lenses, left temple and right temple (${totals.triangles.toLocaleString("en-US")} triangles).`);
  } catch (error) {
    setDesignNote(`Could not export 3MF: ${error.message}`);
    log(`Could not export Creator 3MF: ${error.message}`);
  } finally {
    showLoader(false);
  }
}

function buildDesign3mfExportParts(projectRoot) {
  const p = designGeometryParams();
  const definition = designDefinitionFromDraft();
  const style = normalizeDesignStyle(definition);
  const frontMaterial = new THREE.MeshStandardMaterial({ color: style.frameColor, roughness: 0.37, metalness: 0.035 });
  const templeMaterial = new THREE.MeshStandardMaterial({ color: style.templeColor, roughness: 0.37, metalness: 0.035 });
  const detailMaterial = new THREE.MeshStandardMaterial({ color: style.detailColor, roughness: 0.42, metalness: 0.02 });
  const lensMaterial = new THREE.MeshStandardMaterial({ color: style.lensColor, roughness: 0.16, metalness: 0.04 });
  const outerLensWidth = p.lens_width + p.rim_thickness * 2;
  const lensCenter = p.bridge_width / 2 + outerLensWidth / 2;
  const part = (id, label, fileName, title, builder, lens = "Generated acrylic lenses") => {
    const group = new THREE.Group();
    builder(group);
    centerObjectForViewerPivot(group);
    makeExportMaterialsOpaque(group);
    return {
      id,
      label,
      fileName,
      title,
      lens,
      mesh: collectMeshFromObject(group)
    };
  };
  return [
    part("front", "front", `${projectRoot}-front.3mf`, `${state.designDraft.name || "Frame Lab Creator"} front`, (group) => {
      addDesignFrontBody(p, frontMaterial, definition, group);
      addDesignTopVisor(p, frontMaterial, definition, group);
      addDesignNoseWings(p, frontMaterial, definition, group);
      [-1, 1].forEach((side) => addDesignHingeAsset(
        side < 0 ? "frontRight" : "frontLeft",
        designHingeDatum(side, p, definition),
        frontMaterial,
        group
      ));
    }, "No lenses in this part"),
    part("lenses", "lenses", `${projectRoot}-lenses.3mf`, `${state.designDraft.name || "Frame Lab Creator"} lenses`, (group) => {
      addDesignLens(-lensCenter, p, lensMaterial, definition, group);
      addDesignLens(lensCenter, p, lensMaterial, definition, group);
    }),
    part("left-temple", "left temple", `${projectRoot}-left-temple.3mf`, `${state.designDraft.name || "Frame Lab Creator"} left temple`, (group) => {
      addDesignTemple(1, p, outerLensWidth, templeMaterial, detailMaterial, style, definition, group);
    }, "No lenses in this part"),
    part("right-temple", "right temple", `${projectRoot}-right-temple.3mf`, `${state.designDraft.name || "Frame Lab Creator"} right temple`, (group) => {
      addDesignTemple(-1, p, outerLensWidth, templeMaterial, detailMaterial, style, definition, group);
    }, "No lenses in this part")
  ];
}

function setDesignNote(message, tone = "") {
  if (!els.designStatus) return;
  els.designStatus.textContent = message;
  if (tone) els.designStatus.dataset.tone = tone;
  else delete els.designStatus.dataset.tone;
}

function publicPublishingEnabled() {
  return state.brandSettings?.publishingEnabled === true;
}

function canUsePublishing() {
  return isDeveloper() || publicPublishingEnabled();
}

function updateDesignPublishingAccess() {
  const locked = !canUsePublishing();
  if (els.designPublishingPanel) {
    els.designPublishingPanel.classList.toggle("is-disabled", locked);
    els.designPublishingPanel.setAttribute("aria-disabled", locked ? "true" : "false");
  }
  if (els.designPublishingComingSoon) {
    els.designPublishingComingSoon.hidden = !locked;
  }
  if (els.submitDesign) {
    els.submitDesign.disabled = locked;
    els.submitDesign.title = locked ? "Publishing is coming soon." : "";
  }
}

function captureDesignThumbnail() {
  if (!designRenderer || !designScene || !designCamera) return "";
  try {
    const stage = els.designCanvas?.closest(".design-stage");
    const width = Math.max(1, Math.floor(stage?.clientWidth || els.designCanvas?.clientWidth || 1));
    const height = Math.max(1, Math.floor(stage?.clientHeight || els.designCanvas?.clientHeight || 1));
    designCamera.aspect = width / height;
    designCamera.updateProjectionMatrix();
    designRenderer.setSize(width, height, false);
    designRenderer.render(designScene, designCamera);
    return designRenderer.domElement.toDataURL("image/jpeg", 0.82);
  } catch {
    return "";
  }
}

async function submitDesignForReview() {
  syncDesignDraftFromControlValues({ preserveManualCode: true });
  if (!canUsePublishing()) {
    setDesignNote("Publishing is coming soon. Export stays available now, and review submissions will open after the supporter goal.", "error");
    return;
  }
  if (state.account.role === "visitor" || !sessionToken()) {
    els.accountPanel.hidden = false;
    setDesignNote("Sign in to submit your custom frame for gallery review.");
    return;
  }
  const source = state.designDraft.manualCode ? String(els.designScadCode?.value || "") : buildDesignScad(state.designDraft);
  if (!source.trim()) {
    setDesignNote("OpenSCAD source is required before submission.");
    return;
  }
  els.submitDesign.disabled = true;
  setDesignNote("Submitting your design for review...");
  try {
    const payload = await apiRequest("/api/design-submissions", {
      method: "POST",
      body: JSON.stringify({
        name: state.designDraft.name,
        description: state.designDraft.description,
        params: state.designDraft.params,
        design: designDefinitionFromDraft(),
        scadSource: source,
        thumbnail: captureDesignThumbnail()
      })
    });
    setDesignNote(`${payload.submission.name} was sent for review.`);
    await loadMyDesignSubmissions();
    if (isDeveloper()) await loadDesignSubmissions();
  } catch (error) {
    setDesignNote(error.message || "Could not submit this design.");
  } finally {
    els.submitDesign.disabled = false;
  }
}

async function saveDesignToCollections() {
  if (!isDeveloper() || !sessionToken()) {
    setDesignNote("Developer access is required to publish a collection template.", "error");
    return;
  }
  if (els.saveDesignCollection?.disabled) return;
  setSaveCollectionButtonState("saving");
  setDesignNote("Saving collection to gallery...", "saving");
  syncDesignDraftFromControlValues({ preserveManualCode: true });
  const source = state.designDraft.manualCode ? String(els.designScadCode?.value || "") : buildDesignScad(state.designDraft);
  const existing = state.designDraft.collectionId
    ? state.models.find((model) => model.id === state.designDraft.collectionId)
    : null;
  const previousModels = state.models.map((model) => structuredClone(model));
  const category = "sun";
  const nextOrder = Math.max(-1, ...state.models.filter((item) => item.category === category).map((item) => Number(item.order || 0))) + 1;
  const collection = normalizeStoredModel({
    id: existing?.id || `design-${crypto.randomUUID()}`,
    name: state.designDraft.name,
    category,
    access: existing?.access || "basic",
    description: state.designDraft.description,
    scadSource: source,
    params: state.designDraft.params,
    design: designDefinitionFromDraft(),
    lensMode: "none",
    thumbnail: existing?.thumbnail || captureDesignThumbnail() || "",
    thumbnailSource: existing?.thumbnailSource || (existing?.thumbnail ? "custom" : "creator"),
    components: null,
    assembly: null,
    order: existing?.order ?? nextOrder,
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now()
  });
  state.models = existing
    ? state.models.map((model) => model.id === existing.id ? collection : model)
    : [collection, ...state.models];
  normalizeGalleryOrder(category);
  try {
    await syncCollectionsToBackend({ announce: true });
    persistModels({ syncBackend: false });
    state.designDraft.collectionId = collection.id;
    state.recentSavedCollectionId = collection.id;
    renderGallery();
    setDesignNote(`${collection.name} saved to Collections.`, "success");
    setSaveCollectionButtonState("saved");
  } catch (error) {
    state.models = previousModels;
    persistModels({ syncBackend: false });
    renderGallery();
    setDesignNote(error.message || "Could not save this collection.", "error");
    setSaveCollectionButtonState("error");
  }
}

function setSaveCollectionButtonState(mode = "idle") {
  const button = els.saveDesignCollection;
  if (!button) return;
  clearTimeout(saveCollectionFeedbackTimer);
  button.classList.remove("is-saving", "is-saved", "is-error");
  button.removeAttribute("aria-busy");
  button.disabled = false;
  if (mode === "saving") {
    button.disabled = true;
    button.classList.add("is-saving");
    button.setAttribute("aria-busy", "true");
    button.textContent = "Saving...";
    return;
  }
  if (mode === "saved") {
    button.classList.add("is-saved");
    button.textContent = "Saved";
    saveCollectionFeedbackTimer = setTimeout(() => {
      button.classList.remove("is-saved");
      button.textContent = saveDesignCollectionDefaultLabel;
      state.recentSavedCollectionId = "";
      renderGallery();
    }, 2400);
    return;
  }
  if (mode === "error") {
    button.classList.add("is-error");
    button.textContent = "Try again";
    saveCollectionFeedbackTimer = setTimeout(() => {
      button.classList.remove("is-error");
      button.textContent = saveDesignCollectionDefaultLabel;
    }, 2200);
    return;
  }
  button.textContent = saveDesignCollectionDefaultLabel;
}

function setCollectionEditorButtonState(mode = "idle", editing = Boolean(state.editingModelId)) {
  const button = els.addCollection;
  if (!button) return;
  const defaultLabel = editing ? collectionEditorSaveLabel : collectionEditorAddLabel;
  clearTimeout(collectionEditorFeedbackTimer);
  button.classList.remove("is-saving", "is-saved", "is-error");
  button.removeAttribute("aria-busy");
  button.disabled = false;
  if (mode === "saving") {
    button.disabled = true;
    button.classList.add("is-saving");
    button.setAttribute("aria-busy", "true");
    button.textContent = "Saving...";
    return;
  }
  if (mode === "saved") {
    button.classList.add("is-saved");
    button.textContent = "Saved";
    collectionEditorFeedbackTimer = setTimeout(() => {
      button.classList.remove("is-saved");
      button.textContent = collectionEditorSaveLabel;
      state.recentSavedCollectionId = "";
      renderGallery();
    }, 2400);
    return;
  }
  if (mode === "error") {
    button.classList.add("is-error");
    button.textContent = "Try again";
    collectionEditorFeedbackTimer = setTimeout(() => {
      button.classList.remove("is-error");
      button.textContent = defaultLabel;
    }, 2200);
    return;
  }
  button.textContent = defaultLabel;
}

async function loadMyDesignSubmissions() {
  if (!els.designSubmissionStatus) return;
  if (state.account.role === "visitor" || !sessionToken()) {
    els.designSubmissionStatus.innerHTML = "";
    return;
  }
  try {
    const payload = await apiRequest("/api/design-submissions/mine");
    const submissions = Array.isArray(payload.submissions) ? payload.submissions : [];
    els.designSubmissionStatus.innerHTML = submissions.slice(0, 3).map((submission) => {
      const label = submission.status === "approved" ? "Approved" : submission.status === "rejected" ? "Not approved" : "In review";
      return `<div class="design-own-submission status-${escapeHtml(submission.status)}"><strong>${escapeHtml(submission.name)}</strong><span>${label}</span></div>`;
    }).join("");
  } catch {
    els.designSubmissionStatus.innerHTML = "";
  }
}

async function loadDesignSubmissions() {
  if (!isDeveloper() || !sessionToken() || !els.designSubmissionList) return;
  try {
    const payload = await apiRequest("/api/admin/design-submissions");
    state.designSubmissions = Array.isArray(payload.submissions) ? payload.submissions : [];
    renderDesignSubmissions();
  } catch (error) {
    els.designSubmissionList.innerHTML = `<p class="account-note">${escapeHtml(error.message || "Could not load submissions.")}</p>`;
  }
}

function renderDesignSubmissions() {
  if (!els.designSubmissionList) return;
  if (!state.designSubmissions.length) {
    els.designSubmissionList.innerHTML = `<p class="account-note">No submitted custom designs yet.</p>`;
    return;
  }
  els.designSubmissionList.innerHTML = state.designSubmissions.map((submission) => {
    const dimensions = `${formatNumber(Number(submission.params?.head_width || 0))} mm width / ${formatNumber(Number(submission.params?.bridge_width || 0))} mm bridge`;
    const status = submission.status === "approved" ? "Approved" : submission.status === "rejected" ? "Rejected" : "Pending review";
    const image = submission.thumbnail
      ? `<img class="submission-thumb" src="${submission.thumbnail}" alt="Preview of ${escapeHtml(submission.name)}" />`
      : `<div class="submission-thumb submission-thumb-empty" aria-hidden="true"></div>`;
    const actions = submission.status === "pending"
      ? `<button type="button" class="accent" data-submission-action="approve" data-submission-id="${escapeHtml(submission.id)}">Approve</button>
         <button type="button" class="delete-button" data-submission-action="reject" data-submission-id="${escapeHtml(submission.id)}">Reject</button>`
      : "";
    return `
      <article class="submission-row status-${escapeHtml(submission.status)}">
        ${image}
        <div class="submission-copy">
          <strong>${escapeHtml(submission.name)}</strong>
          <small>${escapeHtml(submission.authorName || submission.authorEmail || "Customer")} · ${escapeHtml(dimensions)}</small>
          <span class="submission-status">${escapeHtml(status)}</span>
        </div>
        <div class="submission-actions">${actions}</div>
      </article>
    `;
  }).join("");
}

async function handleDesignSubmissionReviewClick(event) {
  const button = event.target.closest("button[data-submission-action]");
  if (!button || !isDeveloper()) return;
  const action = button.dataset.submissionAction;
  const id = button.dataset.submissionId;
  button.disabled = true;
  try {
    const payload = await apiRequest(`/api/admin/design-submissions/${encodeURIComponent(id)}/${action}`, { method: "POST" });
    if (action === "approve") {
      state.models = await loadStoredModels();
      renderGallery();
      log(`Published Creator project: ${payload.submission.name}.`);
    } else {
      log(`Rejected Creator project: ${payload.submission.name}.`);
    }
    await loadDesignSubmissions();
    await loadStorageDebug({ silent: true });
  } catch (error) {
    log(error.message || "Could not review this submission.");
    button.disabled = false;
  }
}

function loadPublishedDesignIntoLab(model) {
  const storedCode = String(model.scadSource || "");
  const definition = normalizeParametricDesign(model.design);
  const params = { ...structuredClone(defaultParams), ...model.params };
  params.frame_depth = definition.features.extrude.depth;
  params.bevel = definition.features.chamfer.enabled
    ? definition.features.chamfer.amount
    : definition.features.fillet.enabled ? definition.features.fillet.radius : 0;
  state.designDraft = {
    name: model.name,
    description: model.description,
    params,
    style: normalizeDesignStyle(definition),
    sketch: definition.sketch,
    templeSketch: definition.templeSketch,
    features: definition.features,
    construction: definition.construction,
    publicParameters: definition.publicParameters,
    sliderRanges: definition.sliderRanges,
    collectionId: model.id,
    step: "front",
    view: "sketch",
    code: storedCode,
    manualCode: Boolean(storedCode.trim())
  };
  buildDesignControls();
  if (state.designDraft.manualCode && els.designScadCode) {
    state.designDraft.code = storedCode;
    els.designScadCode.value = storedCode;
  }
  switchDesignTab("front");
  setDesignView("sketch");
  navigateToView("design-lab");
  renderDesignPreview({ fitView: true });
  setDesignNote(isDeveloper() ? "Collection template loaded. Edit the sketch or feature stack and save it again." : "Published parametric design loaded.");
}

function sceneBackgroundColor() {
  return state.brandSettings?.sceneColor || defaultBrandSettings.sceneColor;
}

function previewBackgroundColor() {
  return mixHex(state.brandSettings?.sceneColor || defaultBrandSettings.sceneColor, state.brandSettings?.surfaceColor || defaultBrandSettings.surfaceColor, 0.42);
}

function sanitizeHexColor(value, fallback = defaultAccentColor) {
  const match = String(value || "").trim().match(/^#?([0-9a-f]{6})$/i);
  return match ? `#${match[1].toLowerCase()}` : fallback;
}

function sanitizeAccentColor(value, fallback = defaultAccentColor) {
  return sanitizeHexColor(value, fallback);
}

function normalizeColorSlots(slots) {
  const source = Array.isArray(slots) && slots.length ? slots : defaultColorSlots;
  return source
    .slice(0, 6)
    .map((color, index) => sanitizeHexColor(color, defaultColorSlots[index] || defaultAccentColor));
}

function cleanText(value, fallback = "", limit = 500) {
  const text = String(value ?? fallback).trim();
  return (text || fallback).slice(0, limit);
}

function normalizePlanBenefits(value, fallback = []) {
  const source = Array.isArray(value)
    ? value
    : String(value || "").split("\n");
  const fallbackList = Array.isArray(fallback) ? fallback : [];
  const benefits = source
    .map((item) => cleanText(item, "", 120))
    .filter(Boolean)
    .slice(0, 6);
  return benefits.length ? benefits : fallbackList.slice(0, 6);
}

function sanitizeContentImage(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  const image = String(value || "").trim();
  if (!image) return "";
  if (
    image.startsWith("data:image/") ||
    image.startsWith("./assets/") ||
    image.startsWith("./api/settings/print-guide-image") ||
    image.startsWith("/api/settings/print-guide-image")
  ) {
    return image;
  }
  return fallback;
}

function sanitizeHeroImage(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  const image = String(value || "").trim();
  if (!image) return "";
  if (
    image.startsWith("data:image/") ||
    image.startsWith("./assets/") ||
    image.startsWith("./api/settings/hero-image") ||
    image.startsWith("/api/settings/hero-image")
  ) {
    return image;
  }
  return fallback;
}

function cleanPrintGuideIntro(value, fallback) {
  const intro = cleanText(value, fallback, 500);
  return /^Use PETG, PA-CF or a tough PLA blend/i.test(intro) ? fallback : intro;
}

function normalizeFaqItem(item = {}, fallback = {}) {
  const question = cleanText(item.question, fallback.question || "Question", 120);
  const answer = cleanText(item.answer, fallback.answer || "", 360);
  const developerOnlyCopy = /developer tools|add new fronts|frame variants/i.test(`${question} ${answer}`);
  return developerOnlyCopy
    ? {
        question: fallback.question || defaultContentSettings.faq.items[2].question,
        answer: fallback.answer || defaultContentSettings.faq.items[2].answer
      }
    : { question, answer };
}

function normalizePlanContent(item = {}, fallback = {}) {
  const plan = planProductIds.includes(item.plan) ? item.plan : fallback.plan;
  const access = accessPlanIds.includes(item.access) ? item.access : fallback.access;
  return {
    plan,
    access,
    name: cleanText(item.name, fallback.name, 40),
    price: cleanText(item.price, fallback.price, 24),
    period: cleanText(item.period, fallback.period, 32),
    exports: cleanText(item.exports, fallback.exports, 90),
    description: cleanText(item.description, fallback.description, 180),
    benefits: normalizePlanBenefits(item.benefits, fallback.benefits)
  };
}

function normalizeSizeRow(row = {}, fallback = {}) {
  const numberValue = (value, defaultValue, min = 0, max = 300) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return defaultValue;
    return Math.min(max, Math.max(min, Math.round(numeric)));
  };
  return {
    size: ["S", "M", "L"].includes(row.size) ? row.size : fallback.size,
    label: cleanText(row.label, fallback.label, 48),
    headMin: numberValue(row.headMin, fallback.headMin, 90, 220),
    headMax: numberValue(row.headMax, fallback.headMax, 90, 220),
    frameWidth: cleanText(row.frameWidth, fallback.frameWidth, 48),
    lensWidth: cleanText(row.lensWidth, fallback.lensWidth, 48),
    bridgeMin: numberValue(row.bridgeMin, fallback.bridgeMin, 8, 34),
    bridgeMax: numberValue(row.bridgeMax, fallback.bridgeMax, 8, 34),
    templeMin: numberValue(row.templeMin, fallback.templeMin, 100, 190),
    templeMax: numberValue(row.templeMax, fallback.templeMax, 100, 190),
    note: cleanText(row.note, fallback.note, 160)
  };
}

function normalizeContentSettings(content = {}) {
  const defaults = structuredClone(defaultContentSettings);
  const planById = new Map((Array.isArray(content.plans) ? content.plans : []).map((item) => [item.plan, item]));
  const sizeById = new Map((Array.isArray(content.sizes?.rows) ? content.sizes.rows : []).map((item) => [item.size, item]));
  return {
    plans: defaults.plans.map((fallback) => normalizePlanContent(planById.get(fallback.plan), fallback)),
    sizes: {
      heading: cleanText(content.sizes?.heading, defaults.sizes.heading, 80),
      intro: cleanText(content.sizes?.intro, defaults.sizes.intro, 320),
      rows: defaults.sizes.rows.map((fallback) => normalizeSizeRow(sizeById.get(fallback.size), fallback))
    },
    printGuide: {
      heading: cleanText(content.printGuide?.heading, defaults.printGuide.heading, 80),
      intro: cleanPrintGuideIntro(content.printGuide?.intro, defaults.printGuide.intro),
      image: sanitizeContentImage(content.printGuide?.image, defaults.printGuide.image)
    },
    roadmap: {
      heading: cleanText(content.roadmap?.heading, defaults.roadmap.heading, 80),
      items: (Array.isArray(content.roadmap?.items) ? content.roadmap.items : defaults.roadmap.items)
        .slice(0, 8)
        .map((item, index) => ({
          title: cleanText(item.title, defaults.roadmap.items[index]?.title || "Roadmap item", 90),
          status: cleanText(item.status, defaults.roadmap.items[index]?.status || "Planned", 40),
          description: cleanText(item.description, defaults.roadmap.items[index]?.description || "", 220)
        }))
    },
    license: {
      heading: cleanText(content.license?.heading, defaults.license.heading, 80),
      body: cleanText(content.license?.body, defaults.license.body, 800)
    },
    faq: {
      heading: cleanText(content.faq?.heading, defaults.faq.heading, 80),
      items: (Array.isArray(content.faq?.items) ? content.faq.items : defaults.faq.items)
        .slice(0, 10)
        .map((item, index) => normalizeFaqItem(item, defaults.faq.items[index] || defaults.faq.items[2]))
    }
  };
}

function normalizeBrandSettings(settings = {}) {
  const heroImage = sanitizeHeroImage(settings.heroImage, "");
  return {
    accentColor: sanitizeAccentColor(settings.accentColor),
    backgroundColor: sanitizeHexColor(settings.backgroundColor, defaultBrandSettings.backgroundColor),
    surfaceColor: sanitizeHexColor(settings.surfaceColor, defaultBrandSettings.surfaceColor),
    textColor: sanitizeHexColor(settings.textColor, defaultBrandSettings.textColor),
    mutedColor: sanitizeHexColor(settings.mutedColor, defaultBrandSettings.mutedColor),
    borderColor: sanitizeHexColor(settings.borderColor, defaultBrandSettings.borderColor),
    sceneColor: sanitizeHexColor(settings.sceneColor, defaultBrandSettings.sceneColor),
    heroTitle: String(settings.heroTitle || defaultBrandSettings.heroTitle).trim().slice(0, 120) || defaultBrandSettings.heroTitle,
    heroText: String(settings.heroText || defaultBrandSettings.heroText).trim().slice(0, 320) || defaultBrandSettings.heroText,
    heroImage,
    heroModelId: String(settings.heroModelId || "").trim().slice(0, 120),
    publishingEnabled: settings.publishingEnabled === true,
    content: normalizeContentSettings(settings.content)
  };
}

function hexToRgb(hex) {
  const clean = sanitizeHexColor(hex, defaultAccentColor).slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
}

function mixHex(hex, target = "#ffffff", amount = 0.24) {
  const base = hexToRgb(hex);
  const other = hexToRgb(target);
  const channel = (from, to) => Math.round(from + (to - from) * amount).toString(16).padStart(2, "0");
  return `#${channel(base.r, other.r)}${channel(base.g, other.g)}${channel(base.b, other.b)}`;
}

function rgbaFromHex(hex, alpha) {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function colorLuminance(hex) {
  const rgb = hexToRgb(hex);
  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

function applyBrandSettings() {
  state.brandSettings = normalizeBrandSettings(state.brandSettings);
  const accent = state.brandSettings.accentColor;
  const background = state.brandSettings.backgroundColor;
  const surface = state.brandSettings.surfaceColor;
  const text = state.brandSettings.textColor;
  const muted = state.brandSettings.mutedColor;
  const border = state.brandSettings.borderColor;
  const sceneColor = state.brandSettings.sceneColor;
  const accent2 = mixHex(accent, "#ffffff", 0.22);
  const surface2 = mixHex(surface, text, 0.055);
  const lineStrong = mixHex(border, text, 0.18);
  const rgb = hexToRgb(accent);
  state.brandSettings.accentColor = accent;
  document.documentElement.style.setProperty("--bg", background);
  document.documentElement.style.setProperty("--surface", surface);
  document.documentElement.style.setProperty("--surface-2", surface2);
  document.documentElement.style.setProperty("--ink", text);
  document.documentElement.style.setProperty("--muted", muted);
  document.documentElement.style.setProperty("--line", border);
  document.documentElement.style.setProperty("--line-strong", lineStrong);
  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.style.setProperty("--accent-2", accent2);
  document.documentElement.style.setProperty("--accent-soft", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`);
  document.documentElement.style.setProperty("--graphite", mixHex(surface, background, 0.38));
  document.documentElement.style.setProperty("--topbar-bg", rgbaFromHex(background, 0.94));
  document.documentElement.style.setProperty("--panel-bg", rgbaFromHex(surface, 0.92));
  document.documentElement.style.setProperty("--subtle-bg", rgbaFromHex(text, 0.035));
  document.documentElement.style.setProperty("--switch-bg", rgbaFromHex(text, 0.035));
  document.documentElement.style.setProperty("--preview-bg", mixHex(sceneColor, surface, 0.32));
  document.documentElement.style.setProperty("--log-bg", mixHex(background, surface, 0.26));
  document.documentElement.style.setProperty("--log-ink", text);
  document.documentElement.style.setProperty("--scene-bg-1", mixHex(sceneColor, surface, 0.2));
  document.documentElement.style.setProperty("--scene-bg-2", sceneColor);
  document.documentElement.style.setProperty("--loader-overlay-bg", rgbaFromHex(background, 0.72));
  document.documentElement.style.setProperty("--loader-track", rgbaFromHex(text, 0.08));
  document.documentElement.style.colorScheme = colorLuminance(background) > 0.55 ? "light" : "dark";
  if (scene) scene.background = new THREE.Color(sceneBackgroundColor());
  if (renderer && scene && camera) render();
  if (designScene) {
    designScene.background = new THREE.Color(sceneBackgroundColor());
    renderDesignPreview({ fitView: false });
  }
  writeBrandSettingsToLocalCache(state.brandSettings);
  applyHeroSettings();
  renderPlanCards();
  renderMarketingContent();
  renderFitRecommendation();
  updateDesignPublishingAccess();
  try {
    syncBrandSettingsUi();
  } catch (error) {
    console.warn("Could not sync brand settings editor UI.", error);
  }
}

function writeBrandSettingsToLocalCache(settings) {
  const cacheableSettings = compactBrandSettingsForLocalCache(settings);
  removeLocalStorageItem(brandSettingsStorageKey);
  const result = setLocalStorageItem(brandSettingsStorageKey, JSON.stringify(cacheableSettings));
  if (result.ok) {
    return true;
  }
  removeLocalStorageItem(brandSettingsStorageKey);
  return false;
}

function compactBrandSettingsForLocalCache(settings = {}) {
  const compact = normalizeBrandSettings(settings);
  compact.heroImage = "";
  compact.content = {
    ...compact.content,
    printGuide: {
      ...compact.content.printGuide,
      image: ""
    }
  };
  return compact;
}

function getLocalStorageItem(key, fallback = "") {
  try {
    return globalThis.localStorage?.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function setLocalStorageItem(key, value) {
  try {
    if (!globalThis.localStorage) return { ok: false, error: null };
    globalThis.localStorage.setItem(key, value);
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error };
  }
}

function removeLocalStorageItem(key) {
  try {
    globalThis.localStorage?.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function syncBrandSettingsUi() {
  if (els.brandAccentColor) els.brandAccentColor.value = state.brandSettings.accentColor;
  if (els.brandAccentText) els.brandAccentText.value = state.brandSettings.accentColor;
  if (els.brandBackgroundColor) els.brandBackgroundColor.value = state.brandSettings.backgroundColor;
  if (els.brandSurfaceColor) els.brandSurfaceColor.value = state.brandSettings.surfaceColor;
  if (els.brandTextColor) els.brandTextColor.value = state.brandSettings.textColor;
  if (els.brandMutedColor) els.brandMutedColor.value = state.brandSettings.mutedColor;
  if (els.brandBorderColor) els.brandBorderColor.value = state.brandSettings.borderColor;
  if (els.brandSceneColor) els.brandSceneColor.value = state.brandSettings.sceneColor;
  if (els.heroTitleInput) els.heroTitleInput.value = state.brandSettings.heroTitle;
  if (els.heroTextInput) els.heroTextInput.value = state.brandSettings.heroText;
  if (els.publishingEnabledToggle) els.publishingEnabledToggle.checked = state.brandSettings.publishingEnabled === true;
  renderHeroEditorTargetOptions();
  renderContentEditors();
}

function applyHeroSettings() {
  if (els.heroTitle) els.heroTitle.textContent = state.brandSettings.heroTitle;
  if (els.heroText) els.heroText.textContent = state.brandSettings.heroText;
  if (els.heroImage) els.heroImage.src = state.brandSettings.heroImage || defaultHeroImage;
}

function renderPlanCards() {
  if (!els.pricingGrid && !els.publicPricingGrid) return;
  const content = normalizeContentSettings(state.brandSettings.content);
  const plans = content.plans;
  const publicPlanScroll = els.publicPricingGrid?.scrollLeft || 0;
  const cards = plans.map((plan) => {
    const active = plan.access !== "free" && state.account.plan === plan.access;
    const selected = state.selectedPlanId === plan.plan;
    const benefits = (plan.plan === "supporter" ? [] : normalizePlanBenefits(plan.benefits, [plan.exports, plan.description]))
      .filter((benefit) => !/makerworld/i.test(benefit));
    return `
      <article class="pricing-card${selected ? " selected" : ""}${active ? " active" : ""}${plan.access === "free" ? " supporter" : ""}" data-plan-id="${escapeAttr(plan.plan)}" role="button" tabindex="0" aria-pressed="${selected ? "true" : "false"}">
        <header>
          <span>${escapeHtml(plan.name)}</span>
          ${active ? `<small class="plan-active-label">Active access</small>` : ""}
        </header>
        <div class="price-line"><strong>${escapeHtml(plan.price)}</strong><small>${escapeHtml(plan.period)}</small></div>
        <p>${escapeHtml(plan.description)}</p>
        ${benefits.length ? `
          <ul class="pricing-benefits">
            ${benefits.map((benefit) => `<li>${escapeHtml(benefit)}</li>`).join("")}
          </ul>
        ` : ""}
      </article>
    `;
  }).join("");
  if (els.pricingGrid) els.pricingGrid.innerHTML = cards;
  if (els.publicPricingGrid) {
    els.publicPricingGrid.innerHTML = cards;
    els.publicPricingGrid.scrollLeft = publicPlanScroll;
    requestAnimationFrame(() => snapPlansCarouselToGrid("auto"));
  }
}

function selectPricingPlan(event) {
  const card = event.target.closest(".pricing-card[data-plan-id]");
  if (!card) return;
  state.selectedPlanId = card.dataset.planId || "";
  renderPlanCards();
}

function handlePricingPlanKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest(".pricing-card[data-plan-id]");
  if (!card) return;
  event.preventDefault();
  state.selectedPlanId = card.dataset.planId || "";
  renderPlanCards();
}

let lastPlansCarouselPointerActivation = 0;

function activatePlansCarouselControl(event, direction) {
  const now = performance.now();
  if (event.type === "click" && lastPlansCarouselPointerActivation && now - lastPlansCarouselPointerActivation < 320) {
    event.preventDefault();
    return;
  }
  if (event.type === "pointerup") lastPlansCarouselPointerActivation = now;
  event.preventDefault();
  scrollPlansCarousel(direction);
}

function handlePlansCarouselControlKeydown(event, direction) {
  if (event.key !== "Enter" && event.key !== " ") return;
  activatePlansCarouselControl(event, direction);
}

function scrollPlansCarousel(direction) {
  const track = els.publicPricingGrid;
  if (!track) return;
  const firstCard = track.querySelector(".pricing-card");
  const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
  const distance = firstCard
    ? firstCard.getBoundingClientRect().width + gap
    : Math.max(280, track.clientWidth / 3);
  const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
  const currentIndex = distance > 0 ? Math.round(track.scrollLeft / distance) : 0;
  const maxIndex = distance > 0 ? Math.ceil(maxScroll / distance) : 0;
  const nextIndex = THREE.MathUtils.clamp(currentIndex + direction, 0, maxIndex);
  const nextScroll = THREE.MathUtils.clamp(nextIndex * distance, 0, maxScroll);
  track.scrollTo({ left: nextScroll, behavior: "smooth" });
  window.setTimeout(() => {
    if (Math.abs(track.scrollLeft - nextScroll) > 2) track.scrollLeft = nextScroll;
  }, 220);
}

function snapPlansCarouselToGrid(behavior = "smooth") {
  const track = els.publicPricingGrid;
  if (!track) return;
  const firstCard = track.querySelector(".pricing-card");
  if (!firstCard) return;
  const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
  const distance = firstCard.getBoundingClientRect().width + gap;
  if (distance <= 0) return;
  const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
  const index = Math.round(track.scrollLeft / distance);
  const nextScroll = THREE.MathUtils.clamp(index * distance, 0, maxScroll);
  track.scrollTo({ left: nextScroll, behavior });
}

function renderMarketingContent() {
  const content = normalizeContentSettings(state.brandSettings.content);
  if (els.printGuideHeading) els.printGuideHeading.textContent = content.printGuide.heading;
  if (els.printGuideIntro) els.printGuideIntro.textContent = content.printGuide.intro;
  if (els.printGuideFigure && els.printGuideImage) {
    const image = sanitizeContentImage(content.printGuide.image, "");
    els.printGuideFigure.hidden = !image;
    if (image) {
      els.printGuideImage.src = image;
      if (els.lightboxImage) els.lightboxImage.src = image;
    }
  }
  if (els.roadmapHeading) els.roadmapHeading.textContent = content.roadmap.heading;
  if (els.roadmapItems) {
    els.roadmapItems.innerHTML = content.roadmap.items.map((item) => `
      <article class="roadmap-item">
        <span>${escapeHtml(item.status)}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.description)}</p>
      </article>
    `).join("");
  }
  if (els.licenseInfoHeading) els.licenseInfoHeading.textContent = content.license.heading;
  if (els.licenseInfoBody) els.licenseInfoBody.textContent = content.license.body;
  if (els.faqHeading) els.faqHeading.textContent = content.faq.heading;
  if (els.faqItems) {
    els.faqItems.innerHTML = content.faq.items.map((item) => `
      <details class="faq-item">
        <summary>${escapeHtml(item.question)}</summary>
        <p>${escapeHtml(item.answer)}</p>
      </details>
    `).join("");
  }
}

function renderContentEditors() {
  if (!isDeveloper()) return;
  const content = normalizeContentSettings(state.brandSettings.content);
  if (els.planContentEditor) {
    els.planContentEditor.innerHTML = `
      ${content.plans.map((plan) => `
      <fieldset class="content-editor-card" data-plan-editor="${escapeHtml(plan.plan)}">
        <legend>${escapeHtml(plan.name)} plan</legend>
        <input data-plan-field="name" type="text" value="${escapeAttr(plan.name)}" placeholder="Plan name" />
        <input data-plan-field="price" type="text" value="${escapeAttr(plan.price)}" placeholder="$20" />
        <input data-plan-field="period" type="text" value="${escapeAttr(plan.period)}" placeholder="/ year" />
        <input data-plan-field="exports" type="text" value="${escapeAttr(plan.exports)}" placeholder="Creator access summary" />
        <textarea data-plan-field="description" rows="3" placeholder="Plan description">${escapeHtml(plan.description)}</textarea>
        <textarea data-plan-field="benefits" rows="5" placeholder="One benefit per line">${escapeHtml(plan.benefits.join("\n"))}</textarea>
      </fieldset>
    `).join("")}
    `;
  }
  if (els.pageContentEditor) {
    els.pageContentEditor.innerHTML = `
      <fieldset class="content-editor-card wide">
        <legend>How to print it</legend>
        <input data-content-field="printGuide.heading" type="text" value="${escapeAttr(content.printGuide.heading)}" />
        <textarea data-content-field="printGuide.intro" rows="4">${escapeHtml(content.printGuide.intro)}</textarea>
        <div class="content-file-actions">
          <label class="file-button">
            <input data-print-guide-image type="file" accept="image/*" />
            <span>Print guide image</span>
          </label>
          <button type="button" data-clear-print-guide-image>Clear image</button>
          <small>${content.printGuide.image ? "Image attached" : "No image selected"}</small>
        </div>
      </fieldset>
      <fieldset class="content-editor-card wide">
        <legend>Roadmap</legend>
        <input data-content-field="roadmap.heading" type="text" value="${escapeAttr(content.roadmap.heading)}" />
        <textarea data-list-field="roadmap.items" rows="5">${escapeHtml(serializeRoadmapItems(content.roadmap.items))}</textarea>
      </fieldset>
      <fieldset class="content-editor-card wide">
        <legend>License</legend>
        <input data-content-field="license.heading" type="text" value="${escapeAttr(content.license.heading)}" />
        <textarea data-content-field="license.body" rows="4">${escapeHtml(content.license.body)}</textarea>
      </fieldset>
      <fieldset class="content-editor-card wide">
        <legend>FAQ</legend>
        <input data-content-field="faq.heading" type="text" value="${escapeAttr(content.faq.heading)}" />
        <textarea data-list-field="faq.items" rows="6">${escapeHtml(serializeFaqItems(content.faq.items))}</textarea>
      </fieldset>
    `;
  }
}

function serializeRoadmapItems(items = []) {
  return items.map((item) => `${item.title} | ${item.status} | ${item.description}`).join("\n");
}

function serializeFaqItems(items = []) {
  return items.map((item) => `${item.question} | ${item.answer}`).join("\n");
}

function readContentSettingsFromEditor() {
  const base = normalizeContentSettings(state.brandSettings.content);
  const planById = new Map(base.plans.map((plan) => [plan.plan, { ...plan }]));
  els.planContentEditor?.querySelectorAll("[data-plan-editor]").forEach((card) => {
    const planId = card.dataset.planEditor;
    const current = planById.get(planId);
    if (!current) return;
    card.querySelectorAll("[data-plan-field]").forEach((field) => {
      current[field.dataset.planField] = field.value;
    });
  });
  const content = {
    ...base,
    plans: [...planById.values()]
  };
  [els.planContentEditor, els.pageContentEditor].forEach((editor) => {
    editor?.querySelectorAll("[data-content-field]").forEach((field) => {
      setContentPath(content, field.dataset.contentField, field.value);
    });
  });
  const roadmapField = els.pageContentEditor?.querySelector('[data-list-field="roadmap.items"]');
  if (roadmapField) content.roadmap.items = parseRoadmapItems(roadmapField.value);
  const faqField = els.pageContentEditor?.querySelector('[data-list-field="faq.items"]');
  if (faqField) content.faq.items = parseFaqItems(faqField.value);
  return normalizeContentSettings(content);
}

function setContentPath(target, path, value) {
  const [section, field] = String(path || "").split(".");
  if (section && !field && Object.prototype.hasOwnProperty.call(target, section)) {
    target[section] = value;
    return;
  }
  if (!section || !field || !target[section]) return;
  target[section][field] = value;
}

function parseRoadmapItems(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((line) => {
      const [title = "", status = "Planned", description = ""] = line.split("|").map((part) => part.trim());
      return { title, status, description };
    });
}

function parseFaqItems(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 10)
    .map((line) => {
      const [question = "", answer = ""] = line.split("|").map((part) => part.trim());
      return { question, answer };
    });
}

function syncBrandSettingsFromInputs() {
  state.brandSettings = normalizeBrandSettings({
    ...state.brandSettings,
    accentColor: els.brandAccentText?.value || els.brandAccentColor?.value || state.brandSettings.accentColor,
    backgroundColor: els.brandBackgroundColor?.value || state.brandSettings.backgroundColor,
    surfaceColor: els.brandSurfaceColor?.value || state.brandSettings.surfaceColor,
    textColor: els.brandTextColor?.value || state.brandSettings.textColor,
    mutedColor: els.brandMutedColor?.value || state.brandSettings.mutedColor,
    borderColor: els.brandBorderColor?.value || state.brandSettings.borderColor,
    sceneColor: els.brandSceneColor?.value || state.brandSettings.sceneColor,
    heroTitle: els.heroTitleInput?.value || state.brandSettings.heroTitle,
    heroText: els.heroTextInput?.value || state.brandSettings.heroText,
    heroModelId: els.heroEditorTarget?.value || state.brandSettings.heroModelId,
    publishingEnabled: els.publishingEnabledToggle?.checked === true,
    content: readContentSettingsFromEditor()
  });
  applyBrandSettings();
}

async function hydrateSystemStatus() {
  try {
    const payload = await apiRequest("/api/system");
    if (payload.storage) state.system.storage = payload.storage;
  } catch {
    state.system.storage = {
      persistent: false,
      source: "unknown",
      message: "Could not verify Railway storage."
    };
  }
  renderStorageStatus();
}

function renderStorageStatus() {
  if (!els.storageStatusNote) return;
  if (!isDeveloper()) {
    els.storageStatusNote.textContent = "";
    if (els.storageDebugPanel) {
      els.storageDebugPanel.hidden = true;
      els.storageDebugPanel.textContent = "";
    }
    return;
  }
  const storage = state.system.storage || {};
  const warnings = Array.isArray(storage.warnings) && storage.warnings.length ? ` ${storage.warnings.join(" ")}` : "";
  els.storageStatusNote.textContent = storage.persistent
    ? `Persistent storage active: ${storage.source || "Railway volume"}. Accounts, colors and collections should survive deploys.${warnings}`
    : `${storage.message || "Persistent storage is not configured."} Add a Railway Volume and set FRAME_LAB_DATA_DIR to its mount path, for example /data.`;
}

function formatStorageBytes(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function renderStorageDebug(payload) {
  if (!els.storageDebugPanel) return;
  const file = payload.file || {};
  const counts = payload.counts || {};
  const storage = payload.storage || {};
  els.storageDebugPanel.hidden = false;
  els.storageDebugPanel.textContent = [
    `Persistent: ${storage.persistent ? "yes" : "no"} (${storage.source || "unknown"})`,
    `Data dir: ${payload.dataDir || "-"}`,
    `DB file: ${payload.dbPath || "-"}`,
    `DB exists: ${file.exists ? "yes" : "no"}`,
    `DB size: ${formatStorageBytes(file.bytes)}`,
    `DB updated: ${file.updatedAt || "-"}`,
    `Users: ${counts.users ?? 0}`,
    `Sessions: ${counts.sessions ?? 0}`,
    `Collections: ${counts.collections ?? 0}`,
    `Components: ${counts.components ?? 0}`,
    `Design submissions: ${counts.designSubmissions ?? 0}`,
    `Downloads: ${counts.downloads ?? 0}`,
    `Generated codes: ${counts.licenseCodes ?? 0}`
  ].join("\n");
}

async function loadStorageDebug(options = {}) {
  if (!isDeveloper() || !sessionToken()) {
    if (els.storageDebugPanel) {
      els.storageDebugPanel.hidden = true;
      els.storageDebugPanel.textContent = "";
    }
    return false;
  }
  try {
    const payload = await apiRequest("/api/admin/storage-debug");
    renderStorageDebug(payload);
    return true;
  } catch (error) {
    if (!options.silent && els.storageStatusNote) {
      els.storageStatusNote.textContent = error.message || "Could not load storage diagnostics.";
    }
    return false;
  }
}

async function hydrateBrandSettings() {
  try {
    const payload = await apiRequest("/api/public-settings");
    if (payload.settings) {
      state.brandSettings = normalizeBrandSettings(payload.settings);
      applyBrandSettings();
      return true;
    }
  } catch {
    applyBrandSettings();
  }
  return false;
}

function setBrandColor(key, value, options = {}) {
  if (!Object.prototype.hasOwnProperty.call(defaultBrandSettings, key) || !key.endsWith("Color")) return false;
  const color = sanitizeHexColor(value, "");
  if (!color) {
    if (els.brandSettingsNote) els.brandSettingsNote.textContent = "Use a six digit hex color, for example #c96b34.";
    return false;
  }
  state.brandSettings[key] = color;
  applyBrandSettings();
  if (els.brandSettingsNote && options.previewOnly) els.brandSettingsNote.textContent = "Previewing brand colors. Save to publish them.";
  return true;
}

function setBrandAccent(value, options = {}) {
  return setBrandColor("accentColor", value, options);
}

async function saveBrandSettings() {
  if (!isDeveloper() || !sessionToken()) {
    if (els.brandSettingsNote) els.brandSettingsNote.textContent = "Developer login is required to save brand settings.";
    return;
  }
  syncBrandSettingsFromInputs();
  if (!setBrandAccent(state.brandSettings.accentColor)) return;
  try {
    const payload = await apiRequest("/api/settings", {
      method: "PUT",
      body: JSON.stringify({ settings: state.brandSettings })
    });
    state.brandSettings = normalizeBrandSettings(payload.settings);
    applyBrandSettings();
    if (els.brandSettingsNote) els.brandSettingsNote.textContent = "Brand settings saved.";
  } catch (error) {
    if (els.brandSettingsNote) els.brandSettingsNote.textContent = error.message || "Could not save brand settings.";
  }
}

async function resetBrandSettings() {
  state.brandSettings = structuredClone(defaultBrandSettings);
  applyBrandSettings();
  await saveBrandSettings();
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-attr]").forEach((element) => {
    element.dataset.i18nAttr.split(";").forEach((item) => {
      const [attr, key] = item.split(":");
      if (attr && key) element.setAttribute(attr, t(key));
    });
  });
  updateAccountUi();
  applyHeroSettings();
  syncStudioModeUi();
}

function buildControls() {
  els.controls.innerHTML = "";
  const definition = state.activeParametricDesign ? normalizeParametricDesign(state.activeParametricDesign) : null;
  const activeKeys = definition ? new Set(definition.publicParameters) : visibleParameterKeys;
  const sliderRanges = definition?.sliderRanges;
  parameterSchema.filter(([key]) => activeKeys.has(key)).forEach(([key, label, hint, min, max, step, unit]) => {
    const range = sliderRanges?.[key];
    const rangeMin = range?.min ?? min;
    const rangeMax = range?.max ?? max;
    const rangeStep = range?.step ?? step;
    const translated = getParameterText(key, label, hint);
    const row = document.createElement("div");
    row.className = "control";
    row.innerHTML = `
      <label for="${key}">
        <span>${translated.label}</span>
        <small>${translated.hint}</small>
      </label>
      <input id="${key}" data-param="${key}" type="range" min="${rangeMin}" max="${rangeMax}" step="${rangeStep}" value="${state.params[key]}" />
      <output id="${key}Output">${formatValue(state.params[key], unit)}</output>
    `;
    els.controls.append(row);
  });
}

function buildBuilderControls() {
  disposeComponentPreviews();
  const parts = [
    { key: "front", label: t("frontComponent"), items: componentLibrary.fronts },
    { key: "leftTemple", label: t("leftTempleComponent"), items: templeItemsForKey("leftTemple") },
    { key: "rightTemple", label: t("rightTempleComponent"), items: templeItemsForKey("rightTemple") },
    { key: "lens", label: t("lensComponent"), items: componentLibrary.lenses, optional: true }
  ];
  const sizedParts = parts.map((part) => ({
    ...part,
    allItems: part.items,
    items: part.items.filter((item) => item.sizes?.[state.assemblySize])
  }));
  els.builderControls.innerHTML = `${assemblySizeTemplate()}${colorSlotPaletteTemplate()}${sizedParts.map((part) => componentCardTemplate(part)).join("")}`;
  renderComponentPreviews(sizedParts);
  renderComponentFileList();
}

function assemblySizeTemplate() {
  const completeSizes = availableAssemblySizes();
  return `
    <article class="assembly-size-panel">
      <strong>${t("frameSize")}</strong>
      <div class="size-row" role="group" aria-label="${t("frameSize")}">
        ${["S", "M", "L"].map((size) => `
          <button type="button" class="size-chip${state.assemblySize === size ? " active" : ""}" data-assembly-size="${size}" aria-pressed="${state.assemblySize === size}" ${completeSizes.includes(size) || state.assemblySize === size ? "" : "disabled"}>
            ${size}
          </button>
        `).join("")}
      </div>
    </article>
  `;
}

function availableAssemblySizes() {
  const requiredParts = [
    componentLibrary.fronts,
    templeItemsForKey("leftTemple"),
    templeItemsForKey("rightTemple")
  ];
  return ["S", "M", "L"].filter((size) => requiredParts.every((items) => items.some((item) => item.sizes?.[size])));
}

function colorSlotPaletteTemplate() {
  const slots = normalizeColorSlots(state.colorSlots);
  return `
    <article class="color-slots-panel">
      <div class="color-slots-head">
        <strong>Color palette</strong>
        <small>Edit slots</small>
      </div>
      <div class="color-slots-grid">
        ${slots.map((color, index) => `
          <button type="button" class="color-slot-editor${state.colorEditor.type === "slot" && state.colorEditor.index === index ? " active" : ""}" style="--slot-color:${escapeHtml(color)}" data-edit-color-slot="${index}" aria-label="Edit color slot ${index + 1}" aria-expanded="${state.colorEditor.type === "slot" && state.colorEditor.index === index}">
            <span aria-hidden="true"></span>
            <small>${index + 1}</small>
          </button>
        `).join("")}
      </div>
    </article>
  `;
}

function componentCardTemplate(part) {
  const selection = state.assembly[part.key];
  const selectedModel = part.items.find((item) => item.id === selection.modelId) || (part.optional ? null : part.items[0]);
  if (!selectedModel && part.items.length === 0) {
    const hasOtherSizes = Boolean(part.allItems?.length);
    const detail = hasOtherSizes ? `No ${state.assemblySize} option available` : t("noLensComponent");
    const note = hasOtherSizes
      ? `${escapeHtml(part.label)} is not available in size ${state.assemblySize}.`
      : `${escapeHtml(part.label)} is not available in this collection.`;
    return `
      <article class="component-card">
        <div class="component-head">
          <div>
            <strong>${escapeHtml(part.label)}</strong>
            <small>${detail}</small>
          </div>
        </div>
        <div class="compatibility-note">${note}</div>
      </article>
    `;
  }
  if (!selectedModel && part.optional) {
    const options = [noLensOptionTemplate(part), ...part.items.map((item) => optionCardTemplate(part, item, false))].join("");
    return `
      <article class="component-card">
        <div class="component-head">
          <div>
            <strong>${escapeHtml(part.label)}</strong>
            <small>${t("noLensComponent")}</small>
          </div>
        </div>
        <details class="component-options" data-component-options="${part.key}" ${state.openComponentOptions[part.key] ? "open" : ""}>
          <summary>${t("variants")} (${part.items.length})</summary>
          <div class="component-option-grid">${options}</div>
        </details>
      </article>
    `;
  }
  const options = [
    ...(part.optional ? [noLensOptionTemplate(part)] : []),
    ...part.items.map((item) => optionCardTemplate(part, item, item.id === selectedModel.id))
  ].join("");
  const color = state.componentColors[part.key] || selectedModel.materialColor || state.frameColor;
  const slots = normalizeColorSlots(state.colorSlots);
  const matchesSlot = slots.findIndex((slotColor) => sanitizeHexColor(slotColor) === sanitizeHexColor(color));
  const chosenCustom = state.componentColorSources[part.key] === "custom";
  const activeSlotIndex = chosenCustom ? -1 : matchesSlot;
  const customActive = chosenCustom || activeSlotIndex < 0;
  const editorOpen = state.colorEditor.type === "component" && state.colorEditor.key === part.key;
  return `
    <article class="component-card">
      <div class="component-head">
        <div>
          <strong>${escapeHtml(part.label)}</strong>
          <small>${escapeHtml(selectedModel.name)}</small>
        </div>
      </div>
      <div class="component-color-row">
        <span class="component-color-row-label">Color</span>
        <div class="component-color-slots" aria-label="${escapeHtml(part.label)} color options">
          ${slots.map((slotColor, index) => `
            <button type="button" class="color-slot-button${activeSlotIndex === index ? " active" : ""}" style="--slot-color:${escapeHtml(slotColor)}" data-apply-color-slot="${part.key}" data-component-label="${escapeHtml(part.label)}" data-color="${escapeHtml(slotColor)}" title="Choose color slot ${index + 1}" aria-pressed="${activeSlotIndex === index}"></button>
          `).join("")}
          <button type="button" class="component-color${customActive ? " active" : ""}${editorOpen ? " open" : ""}" style="--component-color:${escapeHtml(color)}" data-open-component-color="${part.key}" data-component-label="${escapeHtml(part.label)}" data-current-color="${escapeHtml(color)}" aria-label="Choose custom ${escapeHtml(part.label)} color" aria-pressed="${customActive}" aria-expanded="${editorOpen}">
            <span class="component-color-chip" aria-hidden="true"></span>
            <span class="component-color-text">Custom</span>
          </button>
        </div>
      </div>
      <details class="component-options" data-component-options="${part.key}" ${state.openComponentOptions[part.key] ? "open" : ""}>
        <summary>${t("variants")} (${part.items.length})</summary>
        <div class="component-option-grid">${options}</div>
      </details>
    </article>
  `;
}

function openColorPickerEditor({ type, key = "", index = -1, color, source = "", title }) {
  state.colorEditor = {
    type,
    key,
    index,
    source,
    draft: sanitizeHexColor(color, defaultAccentColor)
  };
  els.colorPickerTitle.textContent = title;
  els.colorPickerInput.value = state.colorEditor.draft;
  updateColorPickerDisplay();
  els.colorPickerPanel.hidden = false;
  document.body.classList.add("color-dialog-open");
  els.colorPickerInput.focus({ preventScroll: true });
  buildBuilderControls();
}

function updateColorPickerDraft() {
  state.colorEditor.draft = sanitizeHexColor(els.colorPickerInput.value, defaultAccentColor);
  updateColorPickerDisplay();
}

function updateColorPickerDisplay() {
  els.colorPickerPanel.style.setProperty("--draft-color", state.colorEditor.draft);
  els.colorPickerValue.textContent = state.colorEditor.draft.toUpperCase();
}

function closeColorPickerEditor(options = {}) {
  state.colorEditor = { type: "", key: "", index: -1, source: "", draft: "" };
  if (els.colorPickerPanel) els.colorPickerPanel.hidden = true;
  document.body.classList.remove("color-dialog-open");
  if (options.rebuild !== false) buildBuilderControls();
}

function applyColorPickerEditor() {
  const editor = { ...state.colorEditor };
  if (!editor.type) return;
  if (editor.type === "slot") {
    state.colorSlots[editor.index] = sanitizeHexColor(editor.draft, state.colorSlots[editor.index] || defaultAccentColor);
    state.colorSlots = normalizeColorSlots(state.colorSlots);
    persistColorSlots();
    closeColorPickerEditor({ rebuild: false });
    buildBuilderControls();
    return;
  }
  state.componentColors[editor.key] = sanitizeHexColor(editor.draft, state.componentColors[editor.key] || defaultAccentColor);
  state.componentColorSources[editor.key] = editor.source === "custom" ? "custom" : "slot";
  closeColorPickerEditor({ rebuild: false });
  buildBuilderControls();
  render({ fitView: false });
  syncActiveModel({ persist: false });
  scheduleModelPersist();
}

function optionCardTemplate(part, item, active) {
  return `
    <button type="button" class="component-option${active ? " active" : ""}" data-component-option="${part.key}" data-model-id="${item.id}">
      <canvas class="component-option-canvas" data-option-preview="${part.key}:${item.id}" aria-label="${escapeHtml(item.name)} 3D"></canvas>
      <span class="component-option-main">
        <strong>${escapeHtml(item.name)}</strong>
        <small>${escapeHtml(componentOptionMeta(part, item))}</small>
      </span>
    </button>
  `;
}

function componentOptionMeta(part, item) {
  const side = item.kind === "temple" ? ` · ${templeSideLabel(item.templeSide)}` : "";
  return `${componentTypeLabel(part.key)}${side}`;
}

function noLensOptionTemplate(part) {
  return `
    <button type="button" class="component-option${state.assembly[part.key].modelId ? "" : " active"} component-option-empty" data-component-option="${part.key}" data-model-id="">
      <span class="component-option-placeholder"></span>
      <span class="component-option-main">
        <strong>${t("noLensComponent")}</strong>
        <small>${t("lensComponent")}</small>
      </span>
    </button>
  `;
}

function componentTypeLabel(keyOrKind) {
  if (keyOrKind === "front") return t("frontComponent");
  if (keyOrKind === "lens") return t("lensComponent");
  return t("templeComponent");
}

function templeSideLabel(side) {
  const normalized = normalizeTempleSide(side);
  if (normalized === "left") return t("leftSide");
  if (normalized === "right") return t("rightSide");
  return t("universalSide");
}

function disposeComponentPreviews() {
  componentPreviewRenderers = [];
}

function renderComponentPreviews(parts) {
  requestAnimationFrame(() => {
    parts.forEach((part) => {
      part.items.forEach((optionItem) => {
        const optionCanvas = els.builderControls.querySelector(`[data-option-preview="${part.key}:${optionItem.id}"]`);
        if (optionCanvas) renderComponentPreviewCanvas(optionCanvas, part.key, optionItem);
      });
    });
  });
}

function renderComponentPreviewCanvas(canvas, key, item) {
  const width = Math.max(120, canvas.clientWidth || 160);
  const height = Math.max(86, canvas.clientHeight || 104);
  const previewScene = new THREE.Scene();
  previewScene.background = new THREE.Color(previewBackgroundColor());
  const previewCamera = new THREE.PerspectiveCamera(34, width / height, 0.1, 1000);
  previewCamera.position.set(42, 34, 112);
  previewCamera.lookAt(0, 0, 0);

  if (!sharedComponentPreviewRenderer) {
    sharedComponentPreviewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    sharedComponentPreviewRenderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  const previewRenderer = sharedComponentPreviewRenderer;
  previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  previewRenderer.setSize(width, height, false);

  previewScene.add(new THREE.HemisphereLight("#fff6e8", "#050708", 2.4));
  const light = new THREE.DirectionalLight("#ffffff", 2.2);
  light.position.set(80, 90, 120);
  previewScene.add(light);

  const group = item.meshObject
    ? makeUploadedPreviewMesh(item)
    : key === "front" ? makeFrontPreviewMesh(item) : key === "lens" ? new THREE.Group() : makeTemplePreviewMesh(item, key === "leftTemple" ? -1 : 1);
  previewScene.add(group);
  const box = new THREE.Box3().setFromObject(group);
  if (box.isEmpty()) {
    previewRenderer.render(previewScene, previewCamera);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      canvas.width = Math.round(width * Math.min(window.devicePixelRatio, 2));
      canvas.height = Math.round(height * Math.min(window.devicePixelRatio, 2));
      ctx.drawImage(previewRenderer.domElement, 0, 0, canvas.width, canvas.height);
    }
    return;
  }
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const distance = Math.max(55, sphere.radius * 2.35);
  previewCamera.position.set(sphere.center.x + sphere.radius * 0.4, sphere.center.y + sphere.radius * 0.35, sphere.center.z + distance);
  previewCamera.lookAt(sphere.center);
  previewRenderer.render(previewScene, previewCamera);
  const ctx = canvas.getContext("2d");
  if (ctx) {
    canvas.width = Math.round(width * Math.min(window.devicePixelRatio, 2));
    canvas.height = Math.round(height * Math.min(window.devicePixelRatio, 2));
    ctx.drawImage(previewRenderer.domElement, 0, 0, canvas.width, canvas.height);
  }
}

function makeFrontPreviewMesh(item) {
  const material = previewMaterial(item);
  const group = new THREE.Group();
  const size = firstSize(item);
  const p = { ...defaultParams, ...size };
  const center = (p.bridge_width + p.lens_width) / 2;
  [-center, center].forEach((x) => {
    const outer = roundedRectShape(p.lens_width + p.rim_thickness * 2.15, p.lens_height + p.rim_thickness * 2.05, p.corner_radius + p.rim_thickness * 0.9);
    outer.holes.push(roundedRectShape(p.lens_width, p.lens_height, p.corner_radius));
    const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, {
      depth: p.frame_depth,
      bevelEnabled: true,
      bevelThickness: 0.45,
      bevelSize: 0.45,
      bevelSegments: 2
    }).center(), material);
    rim.position.x = x;
    group.add(rim);
  });
  const brow = new THREE.Mesh(roundedPrismGeometry(p.bridge_width + p.lens_width * 2 + p.rim_thickness * 5.3, p.rim_thickness, p.frame_depth, 2, 0.35), material);
  brow.position.y = p.lens_height / 2 + p.rim_thickness * 0.72;
  group.add(brow);
  const bridge = new THREE.Mesh(roundedPrismGeometry(p.bridge_width + p.rim_thickness * 2.35, p.rim_thickness * 1.1, p.frame_depth, 1.8, 0.3), material);
  bridge.position.y = p.lens_height * 0.08;
  group.add(bridge);
  group.rotation.set(-0.34, 0.52, 0.03);
  return group;
}

function makeTemplePreviewMesh(item, side) {
  const material = previewMaterial(item);
  const group = new THREE.Group();
  const size = firstSize(item);
  const p = { ...defaultParams, ...size };
  const arm = new THREE.Mesh(roundedPrismGeometry(p.rim_thickness * 1.25, p.rim_thickness * 1.05, p.temple_length, p.rim_thickness * 0.32, 0.35), material);
  arm.position.z = -p.temple_length / 2;
  group.add(arm);
  const hook = new THREE.Mesh(roundedPrismGeometry(p.rim_thickness * 1.3, p.rim_thickness * 1.05, p.temple_drop, p.rim_thickness * 0.32, 0.35), material);
  hook.position.set(0, -p.temple_drop * 0.28, -p.temple_length - p.temple_drop * 0.28);
  hook.rotation.x = THREE.MathUtils.degToRad(-28);
  group.add(hook);
  const hinge = new THREE.Mesh(roundedPrismGeometry(p.hinge_width, p.rim_thickness * 1.7, p.frame_depth * 1.2, 1.5, 0.35), material);
  hinge.position.z = p.frame_depth * 0.5;
  group.add(hinge);
  group.rotation.set(-0.38, side * 0.42, side * 0.04);
  return group;
}

function makeUploadedPreviewMesh(item) {
  const clone = item.meshObject.clone(true);
  clone.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    child.geometry.computeVertexNormals();
    if (!child.material) child.material = previewMaterial(item);
  });
  normalizeObjectForScene(clone);
  clone.rotation.set(-0.28, 0.42, 0.02);
  return clone;
}

function previewMaterial(item, colorOverride = "") {
  return new THREE.MeshStandardMaterial({
    color: colorOverride || item.materialColor || (item.source === "uploaded" ? "#ff8a2a" : "#5f665f"),
    roughness: 0.42,
    metalness: 0.05
  });
}

function applyAssemblyToParams() {
  syncAssemblySizes();
  const front = selectedFront();
  const leftTemple = selectedTemple("leftTemple");
  const rightTemple = selectedTemple("rightTemple");
  const lens = selectedLens();
  if (!front || !leftTemple || !rightTemple) return;
  const frontSize = front.sizes[state.assembly.front.size] || firstSize(front);
  const leftSize = leftTemple.sizes[state.assembly.leftTemple.size] || firstSize(leftTemple);
  const rightSize = rightTemple.sizes[state.assembly.rightTemple.size] || firstSize(rightTemple);
  const templeLength = (leftSize.temple_length + rightSize.temple_length) / 2;
  const templeDrop = Math.max(leftSize.temple_drop, rightSize.temple_drop);
  state.params = {
    ...state.params,
    ...frontSize,
    temple_length: templeLength,
    temple_drop: templeDrop,
    temple_spread: 0
  };
}

function setAssemblySize(size) {
  state.assemblySize = ["S", "M", "L"].includes(size) ? size : "M";
  syncAssemblySizes();
  [
    { key: "front", items: componentLibrary.fronts },
    { key: "leftTemple", items: templeItemsForKey("leftTemple") },
    { key: "rightTemple", items: templeItemsForKey("rightTemple") },
    { key: "lens", items: componentLibrary.lenses, optional: true }
  ].forEach(({ key, items, optional }) => {
    if (optional && !state.assembly[key].modelId) return;
    const selected = items.find((item) => item.id === state.assembly[key].modelId);
    if (selected?.sizes?.[state.assemblySize]) return;
    const replacement = items.find((item) => item.sizes?.[state.assemblySize]);
    if (replacement) state.assembly[key].modelId = replacement.id;
    else if (optional) state.assembly[key].modelId = "";
  });
}

function syncAssemblySizes() {
  ["front", "leftTemple", "rightTemple", "lens"].forEach((key) => {
    state.assembly[key].size = state.assemblySize;
  });
}

function selectFirstAssemblyVariants() {
  [
    { key: "front", items: componentLibrary.fronts },
    { key: "leftTemple", items: templeItemsForKey("leftTemple") },
    { key: "rightTemple", items: templeItemsForKey("rightTemple") },
    { key: "lens", items: componentLibrary.lenses, optional: true }
  ].forEach(({ key, items, optional }) => {
    const first = items.find((item) => item.sizes?.[state.assemblySize]) || null;
    if (first) {
      state.assembly[key].modelId = first.id;
    } else if (optional) {
      state.assembly[key].modelId = "";
    }
  });
  syncAssemblySizes();
}

function firstSize(item) {
  return item.sizes[Object.keys(item.sizes)[0]] || {};
}

function selectedFront() {
  return componentLibrary.fronts.find((item) => item.id === state.assembly.front.modelId) || componentLibrary.fronts[0];
}

function selectedTemple(key) {
  const items = templeItemsForKey(key);
  return items.find((item) => item.id === state.assembly[key].modelId) || items[0];
}

function selectedLens() {
  return componentLibrary.lenses.find((item) => item.id === state.assembly.lens.modelId) || null;
}

function normalizeTempleSide(value) {
  return ["left", "right", "universal"].includes(value) ? value : "universal";
}

function inferTempleSide(fileName = "") {
  const name = String(fileName).toLowerCase();
  if (/(^|[-_\s])(left|lewy|lhs)(?=[-_\s.]|$)/i.test(name)) return "left";
  if (/(^|[-_\s])(right|prawy|rhs)(?=[-_\s.]|$)/i.test(name)) return "right";
  return "universal";
}

function templeSideForKey(key) {
  return key === "rightTemple" ? "right" : "left";
}

function templeItemsForKey(key) {
  const side = templeSideForKey(key);
  const matching = componentLibrary.temples.filter((item) => {
    const itemSide = normalizeTempleSide(item.templeSide);
    return itemSide === side || itemSide === "universal";
  });
  return matching.length ? matching : componentLibrary.temples;
}

function visibleUploadedComponents() {
  return state.uploadedComponents.filter((component) => !state.hiddenComponentIds.has(component.id));
}

function componentSummary(component) {
  return normalizeComponentSummary(component, component?.kind);
}

function normalizeComponentSummary(value, forcedKind = "") {
  if (!value || typeof value !== "object") return null;
  const id = String(value.id || "").trim();
  if (!id) return null;
  const kind = ["front", "temple", "lens"].includes(value.kind) ? value.kind : forcedKind;
  if (!["front", "temple", "lens"].includes(kind)) return null;
  const fileName = String(value.fileName || value.name || "").trim();
  const templeSide = kind === "temple" ? normalizeTempleSide(value.templeSide || value.side || inferTempleSide(fileName)) : "";
  return {
    id,
    name: String(value.name || fileName || componentTypeLabel(kind)).trim(),
    kind,
    templeSide,
    size: ["S", "M", "L"].includes(value.size) ? value.size : "M",
    connector: String(value.connector || "FL-H8").trim() || "FL-H8",
    format: String(value.format || value.type || "").toLowerCase(),
    fileName,
    byteSize: Number(value.byteSize || 0) || 0
  };
}

function normalizeModelComponents(components) {
  if (!components || typeof components !== "object") return null;
  const normalizeList = (value, kind, templeSide = "") => {
    const list = Array.isArray(value) ? value : value ? [value] : [];
    return list
      .map((item) => normalizeComponentSummary(templeSide ? { ...item, templeSide } : item, kind))
      .filter(Boolean);
  };
  const legacyTemples = normalizeList(components.temples, "temple");
  const leftTemples = uniqueComponentsById([
    ...normalizeList(components.leftTemples, "temple", "left"),
    ...legacyTemples.filter((item) => item.templeSide === "left")
  ]);
  const rightTemples = uniqueComponentsById([
    ...normalizeList(components.rightTemples, "temple", "right"),
    ...legacyTemples.filter((item) => item.templeSide === "right")
  ]);
  const universalTemples = legacyTemples.filter((item) => normalizeTempleSide(item.templeSide) === "universal");
  const normalized = {
    front: normalizeList(components.front, "front"),
    temples: uniqueComponentsById(universalTemples),
    leftTemples,
    rightTemples,
    lenses: normalizeList(components.lenses, "lens")
  };
  return normalized.front.length || normalized.temples.length || normalized.leftTemples.length || normalized.rightTemples.length || normalized.lenses.length ? normalized : null;
}

function uniqueComponentsById(components) {
  return [...new Map(components.map((item) => [item.id, item])).values()];
}

function modelComponentsInOrder(model = currentModelRecord()) {
  const components = normalizeModelComponents(model?.components);
  if (!components) return [];
  return [...components.front, ...components.temples, ...components.leftTemples, ...components.rightTemples, ...components.lenses];
}

function componentsForModel(model = currentModelRecord()) {
  const visible = visibleUploadedComponents();
  const linkedComponents = modelComponentsInOrder(model);
  if (linkedComponents.length) {
    const visibleById = new Map(visible.map((component) => [component.id, component]));
    return linkedComponents.map((component) => visibleById.get(component.id)).filter(Boolean);
  }
  if (model?.id === defaultModelId) return visible.filter((component) => component.source === "asset" || !component.collectionId);
  return visible.filter((component) => component.collectionId === model?.id);
}

function componentsForActiveModel() {
  return componentsForModel(currentModelRecord());
}

function rebuildComponentLibrary() {
  componentLibrary.fronts = structuredClone(baseComponentLibrary.fronts);
  componentLibrary.temples = structuredClone(baseComponentLibrary.temples);
  componentLibrary.lenses = structuredClone(baseComponentLibrary.lenses);

  const visible = visibleUploadedComponents();
  const scoped = componentsForActiveModel();
  const scopedByKind = (kind) => scoped.filter((component) => component.kind === kind);
  const seedByKind = (kind) => visible.filter((component) => component.source === "asset" && component.kind === kind);
  const components = currentModelRecord()?.design ? [] : [
    ...(scopedByKind("front").length ? scopedByKind("front") : seedByKind("front")),
    ...(scopedByKind("temple").length ? scopedByKind("temple") : seedByKind("temple")),
    ...scopedByKind("lens")
  ];

  components.forEach((component) => {
    const target = component.kind === "front" ? componentLibrary.fronts : component.kind === "lens" ? componentLibrary.lenses : componentLibrary.temples;
    target.push(componentToLibraryItem(component));
  });
}

function componentToLibraryItem(component) {
  const sizeParams = component.kind === "front"
    ? {
        head_width: component.size === "S" ? 136 : component.size === "L" ? 164 : 150,
        bridge_width: component.size === "S" ? 17 : component.size === "L" ? 20 : 18,
        lens_width: component.size === "S" ? 49 : component.size === "L" ? 55 : 52,
        lens_height: component.size === "S" ? 35 : component.size === "L" ? 39 : 37
      }
    : component.kind === "lens"
      ? {}
    : {
        temple_length: 100,
        temple_drop: component.size === "S" ? 22 : component.size === "L" ? 36 : 30,
        temple_spread: 0
      };
  return {
    id: component.id,
    name: component.name,
    kind: component.kind,
    templeSide: component.kind === "temple" ? normalizeTempleSide(component.templeSide || inferTempleSide(component.fileName)) : "",
    connector: component.connector,
    source: component.source || "uploaded",
    collectionId: component.collectionId || "",
    fileName: component.fileName,
    format: component.format,
    analysis: component.analysis || null,
    materialColor: component.materialColor || component.analysis?.materialColor || null,
    meshObject: component.meshObject || null,
    sizes: {
      [component.size]: sizeParams
    }
  };
}

function renderComponentFileList() {
  if (!els.componentFileList) return;
  if (!state.editingModelId && !els.collectionEditorPanel.hidden) {
    els.componentFileList.innerHTML = `<div class="compatibility-note">Save the collection first, then add individual component options in this frame workspace.</div>`;
    return;
  }
  const components = componentsForActiveModel();
  if (!components.length) {
    els.componentFileList.innerHTML = `<div class="compatibility-note">${t("noComponents")}</div>`;
    return;
  }
  els.componentFileList.innerHTML = components.map((component) => `
    <div class="component-file-row">
      <div>
        <strong>${escapeHtml(component.name)}</strong>
        <small>${escapeHtml(component.fileName)}</small>
        <small>${escapeHtml(component.analysis?.summary || "")}</small>
      </div>
      ${component.materialColor || component.analysis?.materialColor ? `<span class="material-swatch" style="--swatch:${escapeHtml(component.materialColor || component.analysis.materialColor)}">${escapeHtml(component.materialColor || component.analysis.materialColor)}</span>` : ""}
      <span class="status">${escapeHtml(componentTypeLabel(component.kind))}</span>
      ${component.kind === "temple" ? `<span class="status">${escapeHtml(templeSideLabel(component.templeSide))}</span>` : ""}
      <span class="status">${component.size} · ${component.connector}</span>
      <small>${component.format.toUpperCase()} · ${component.source === "asset" ? "Test asset" : t("storedLocally")}</small>
      ${isDeveloper() ? `<button type="button" class="compact delete-button" data-component-delete="${component.id}">Delete</button>` : ""}
    </div>
  `).join("");
}

function renderFrameEditorAssets() {
  if (!els.frameEditorPhoto || !els.frameEditorComponentGallery) return;
  const model = state.editingModelId ? state.models.find((item) => item.id === state.editingModelId) : null;
  const pendingThumbnail = state.croppedCollectionImage;
  if (!model) {
    if (pendingThumbnail) {
      els.frameEditorPhoto.src = pendingThumbnail;
      els.frameEditorPhoto.alt = "Custom collection thumbnail preview";
      els.frameEditorPhotoCaption.textContent = "Custom thumbnail ready. Save collection to publish it.";
    } else {
      els.frameEditorPhoto.removeAttribute("src");
      els.frameEditorPhoto.alt = "";
      els.frameEditorPhotoCaption.textContent = "Save the frame first to manage its photo and components here.";
    }
    els.frameEditorComponentGallery.innerHTML = `
      <div class="frame-component-empty">
        <strong>No frame selected.</strong>
        <small>Create or save a frame collection, then this workspace will show only its own component options.</small>
      </div>
    `;
    return;
  }
  const thumbnail = pendingThumbnail || model.thumbnail || makeAutoCollectionThumbnail(model.name, model.params || defaultParams, model.category);
  els.frameEditorPhoto.src = thumbnail;
  els.frameEditorPhoto.alt = pendingThumbnail ? `${model.name} custom thumbnail preview` : `${model.name} photo`;
  els.frameEditorPhotoCaption.textContent = pendingThumbnail ? "Custom thumbnail ready. Save changes to publish it." : model.name;

  const components = componentsForModel(model);
  if (!components.length) {
    els.frameEditorComponentGallery.innerHTML = `
      <div class="frame-component-empty">
        <strong>No component options yet.</strong>
        <small>Add fronts, left temples, right temples, or lens files for this frame only.</small>
      </div>
    `;
    return;
  }
  els.frameEditorComponentGallery.innerHTML = components.map((component) => {
    const previewKey = component.kind === "front"
      ? "front"
      : component.kind === "lens"
        ? "lens"
        : normalizeTempleSide(component.templeSide) === "right" ? "rightTemple" : "leftTemple";
    const color = component.materialColor || component.analysis?.materialColor || "";
    return `
      <article class="frame-component-card">
        <canvas class="frame-component-preview" data-frame-component-preview="${previewKey}" data-component-id="${escapeHtml(component.id)}" aria-label="${escapeHtml(component.name)} preview"></canvas>
        <div class="frame-component-copy">
          <strong>${escapeHtml(component.name)}</strong>
          <small>${escapeHtml(component.fileName)}</small>
          <div class="frame-component-meta">
            <span>${escapeHtml(componentTypeLabel(component.kind))}</span>
            ${component.kind === "temple" ? `<span>${escapeHtml(templeSideLabel(component.templeSide))}</span>` : ""}
            <span>${escapeHtml(component.size)} · ${escapeHtml(component.connector)}</span>
            ${color ? `<span class="material-swatch compact-swatch" style="--swatch:${escapeHtml(color)}">${escapeHtml(color)}</span>` : ""}
          </div>
        </div>
        ${isDeveloper() ? `<button type="button" class="compact delete-button" data-component-delete="${escapeHtml(component.id)}">Delete</button>` : ""}
      </article>
    `;
  }).join("");

  requestAnimationFrame(() => {
    els.frameEditorComponentGallery.querySelectorAll("[data-frame-component-preview]").forEach((canvas) => {
      const component = components.find((item) => item.id === canvas.dataset.componentId);
      if (!component) return;
      renderComponentPreviewCanvas(canvas, canvas.dataset.frameComponentPreview, componentToLibraryItem(component));
    });
  });
}

async function handleComponentFileListClick(event) {
  const button = event.target.closest("[data-component-delete]");
  if (!button) return;
  if (!isDeveloper()) {
    log("Component deletion is available only in developer mode.");
    return;
  }
  await deleteComponent(button.dataset.componentDelete);
}

async function deleteComponent(id) {
  const component = state.uploadedComponents.find((item) => item.id === id);
  if (!component) return;
  const activeKindCount = (component.kind === "front" ? componentLibrary.fronts : component.kind === "lens" ? componentLibrary.lenses : componentLibrary.temples).length;
  if (component.kind !== "lens" && component.source === "asset" && activeKindCount <= 1) {
    log(`Cannot delete the last ${componentTypeLabel(component.kind).toLowerCase()} component.`);
    return;
  }
  if (component.source === "asset") {
    state.hiddenComponentIds.add(component.id);
    persistHiddenComponents();
  } else {
    await deleteComponentRecord(component.id);
  }
  state.uploadedComponents = state.uploadedComponents.filter((item) => item.id !== component.id);
  removeComponentFromModels(component.id);
  rebuildComponentLibrary();
  repairAssemblyForActiveModel();
  applyAssemblyToParams();
  buildBuilderControls();
  buildControls();
  updateGeneratedSource();
  render();
  syncActiveModel();
  syncStudioModeUi();
  log(`Deleted component: ${component.name}.`);
}

function firstSizeKey(item) {
  return Object.keys(item?.sizes || {})[0] || "M";
}

function assemblyPartForItem(item) {
  return {
    modelId: item?.id || "",
    size: firstSizeKey(item)
  };
}

function normalizeAssemblyPart(value, fallbackItem = null) {
  const fallback = assemblyPartForItem(fallbackItem);
  if (!value || typeof value !== "object") return fallback;
  return {
    modelId: String(value.modelId || value.id || fallback.modelId || ""),
    size: ["S", "M", "L"].includes(value.size) ? value.size : fallback.size
  };
}

function assemblyPartExists(part, items) {
  return items.some((item) => item.id === part.modelId);
}

function repairAssemblyForActiveModel(model = currentModelRecord()) {
  state.assembly.front = normalizeAssemblyPart(model?.assembly?.front || state.assembly.front, componentLibrary.fronts[0]);
  if (!assemblyPartExists(state.assembly.front, componentLibrary.fronts)) {
    state.assembly.front = assemblyPartForItem(componentLibrary.fronts[0]);
  }

  ["leftTemple", "rightTemple"].forEach((key, index) => {
    const items = templeItemsForKey(key);
    const fallback = items[index] || items[0];
    state.assembly[key] = normalizeAssemblyPart(model?.assembly?.[key] || state.assembly[key], fallback);
    if (!assemblyPartExists(state.assembly[key], items)) {
      state.assembly[key] = assemblyPartForItem(fallback);
    }
  });

  const lensPart = normalizeAssemblyPart(model?.assembly?.lens || state.assembly.lens, null);
  state.assembly.lens = assemblyPartExists(lensPart, componentLibrary.lenses)
    ? lensPart
    : { modelId: "", size: "M" };
  const storedSize = model?.assembly?.size || state.assembly.front.size || "M";
  const completeSizes = availableAssemblySizes();
  setAssemblySize(completeSizes.includes(storedSize) ? storedSize : completeSizes[0] || storedSize);
  selectFirstAssemblyVariants();
}

function serializeAssemblySelection() {
  return {
    size: state.assemblySize,
    front: { ...state.assembly.front },
    leftTemple: { ...state.assembly.leftTemple },
    rightTemple: { ...state.assembly.rightTemple },
    lens: { ...state.assembly.lens }
  };
}

function removeComponentFromModels(componentId) {
  state.models.forEach((model) => {
    const components = normalizeModelComponents(model.components);
    if (!components) return;
    const before = JSON.stringify(components);
    components.front = components.front.filter((item) => item.id !== componentId);
    components.temples = components.temples.filter((item) => item.id !== componentId);
    components.leftTemples = components.leftTemples.filter((item) => item.id !== componentId);
    components.rightTemples = components.rightTemples.filter((item) => item.id !== componentId);
    components.lenses = components.lenses.filter((item) => item.id !== componentId);
    const after = JSON.stringify(components);
    if (before === after) return;
    model.components = components.front.length || components.temples.length || components.leftTemples.length || components.rightTemples.length || components.lenses.length ? components : null;
    ["front", "leftTemple", "rightTemple", "lens"].forEach((key) => {
      if (model.assembly?.[key]?.modelId === componentId) model.assembly[key] = { modelId: "", size: "M" };
    });
    model.updatedAt = Date.now();
  });
  persistModels({ syncBackend: false });
  scheduleCollectionsBackendSync();
}

function persistHiddenComponents() {
  setLocalStorageItem(hiddenComponentsStorageKey, JSON.stringify([...state.hiddenComponentIds]));
}

function persistColorSlots() {
  setLocalStorageItem(colorSlotsStorageKey, JSON.stringify(normalizeColorSlots(state.colorSlots)));
}

function render(options = {}) {
  const { fitView = true } = options;
  modelGroup.clear();
  modelGroup.position.set(0, 8, 0);
  modelBasePosition.copy(modelGroup.position);
  modelGroup.rotation.set(0, 0, 0);
  modelGroup.scale.setScalar(1);
  triangleCount = 0;
  if (state.meshObject) {
    renderMeshObject(state.meshObject);
  } else if (selectedAssemblyHasMeshes()) {
    renderUploadedAssembly();
  } else {
    renderParametricPreview();
  }
  updateMetrics();
  if (fitView) fitCameraToObject(modelGroup);
  els.polyCount.textContent = `${triangleCount.toLocaleString("en-US")} tris`;
  els.meshStatus.textContent = state.meshObject ? "STL" : selectedAssemblyHasMeshes() ? "3MF" : "Preview";
}

function selectedAssemblyHasMeshes() {
  return [selectedFront(), selectedTemple("leftTemple"), selectedTemple("rightTemple"), selectedLens()].some((item) => item?.meshObject);
}

function renderUploadedAssembly() {
  [
    { key: "front", item: selectedFront() },
    { key: "leftTemple", item: selectedTemple("leftTemple") },
    { key: "rightTemple", item: selectedTemple("rightTemple") },
    { key: "lens", item: selectedLens() }
  ].forEach(({ key, item }) => {
    if (!item?.meshObject) return;
    const clone = item.meshObject.clone(true);
    const overrideColor = state.componentColors[key];
    clone.traverse((child) => {
      if (!child.isMesh || !child.geometry) return;
      child.geometry.computeVertexNormals();
      if (overrideColor) {
        child.material = previewMaterial(item, overrideColor);
      } else if (!child.material) {
        child.material = previewMaterial(item);
      }
      addTriangles(child.geometry);
    });
    modelGroup.add(clone);
  });
  centerObjectForViewerPivot(modelGroup);
  modelBasePosition.copy(modelGroup.position);
  applyViewerTransform();
  modelGroup.scale.setScalar(1);
}

function renderParametricPreview() {
  if (state.activeParametricDesign) {
    renderPublishedDesignPreview();
    return;
  }
  const p = state.params;
  const material = new THREE.MeshStandardMaterial({
    color: state.frameColor,
    roughness: 0.38,
    metalness: 0.04
  });

  const center = (p.bridge_width + p.lens_width) / 2;
  addRim(-center, p, material);
  addRim(center, p, material);
  addBrowBar(p, material);
  addBridge(p, material);
  addNosePads(p, material);
  addTemple(-1, p, material);
  addTemple(1, p, material);

  centerObjectForViewerPivot(modelGroup);
  modelBasePosition.copy(modelGroup.position);
  applyViewerTransform();
  modelGroup.scale.setScalar(1);
}

function renderPublishedDesignPreview() {
  const p = designGeometryParams(state.params);
  const definition = normalizeParametricDesign(state.activeParametricDesign);
  const style = normalizeDesignStyle(definition);
  const frontMaterial = designPreviewMaterial(THREE.MeshStandardMaterial, { color: style.frameColor, roughness: 0.37, metalness: 0.035 }, style.frameOpacity);
  const templeMaterial = designPreviewMaterial(THREE.MeshStandardMaterial, { color: style.templeColor, roughness: 0.37, metalness: 0.035 }, style.templeOpacity);
  const detailMaterial = new THREE.MeshStandardMaterial({ color: style.detailColor, roughness: 0.42, metalness: 0.02 });
  const lensMaterial = designPreviewMaterial(THREE.MeshPhysicalMaterial, {
    color: style.lensColor,
    roughness: 0.16,
    transmission: style.lensOpacity < 0.995 ? 0.24 : 0
  }, style.lensOpacity);
  const outerLensWidth = p.lens_width + p.rim_thickness * 2;
  const center = p.bridge_width / 2 + outerLensWidth / 2;
  addDesignFrontBody(p, frontMaterial, definition, modelGroup);
  addDesignTopVisor(p, frontMaterial, definition, modelGroup);
  addDesignNoseWings(p, frontMaterial, definition, modelGroup);
  [-1, 1].forEach((side) => {
    addDesignLens(side * center, p, lensMaterial, definition, modelGroup);
    addDesignTemple(side, p, outerLensWidth, templeMaterial, detailMaterial, style, definition, modelGroup);
    addDesignHingeAsset(
      side < 0 ? "frontRight" : "frontLeft",
      designHingeDatum(side, p, definition),
      frontMaterial,
      modelGroup
    );
  });
  centerObjectForViewerPivot(modelGroup);
  modelBasePosition.copy(modelGroup.position);
  applyViewerTransform();
}

function addRim(x, p, material) {
  const outer = roundedRectShape(p.lens_width + p.rim_thickness * 2.15, p.lens_height + p.rim_thickness * 2.05, p.corner_radius + p.rim_thickness * 0.9);
  const inner = roundedRectShape(p.lens_width, p.lens_height, p.corner_radius);
  outer.holes.push(inner);
  const rimGeometry = new THREE.ExtrudeGeometry(outer, {
    depth: p.frame_depth,
    bevelEnabled: p.bevel > 0,
    bevelThickness: Math.max(0.01, p.bevel),
    bevelSize: Math.max(0.01, p.bevel),
    bevelSegments: p.bevel > 0 ? 2 : 0
  });
  rimGeometry.center();
  const rim = new THREE.Mesh(rimGeometry, material);
  rim.position.x = x;
  modelGroup.add(rim);
  addTriangles(rimGeometry);
}

function addBrowBar(p, material) {
  const totalWidth = p.bridge_width + p.lens_width * 2 + p.rim_thickness * 5.3;
  const geometry = roundedPrismGeometry(totalWidth, p.rim_thickness * 1.05, p.frame_depth * 0.95, p.rim_thickness * 0.45, p.bevel * 0.75);
  const brow = new THREE.Mesh(geometry, material);
  brow.position.set(0, p.lens_height / 2 + p.rim_thickness * 0.72, 0.05);
  modelGroup.add(brow);
  addTriangles(geometry);
}

function addBridge(p, material) {
  const geometry = roundedPrismGeometry(p.bridge_width + p.rim_thickness * 2.35, p.rim_thickness * 1.15, p.frame_depth, p.rim_thickness * 0.35, p.bevel * 0.6);
  const bridge = new THREE.Mesh(geometry, material);
  bridge.position.y = p.lens_height * 0.08;
  modelGroup.add(bridge);
  addTriangles(geometry);
}

function addNosePads(p, material) {
  const geometry = roundedPrismGeometry(p.nose_pad_width, p.rim_thickness * 1.45, p.frame_depth * 0.72, p.rim_thickness * 0.35, p.bevel * 0.45);
  [-1, 1].forEach((side) => {
    const pad = new THREE.Mesh(geometry, material);
    pad.position.set(side * (p.bridge_width / 2 + p.nose_pad_width / 2), -p.lens_height / 4 - p.nose_pad_drop / 4, -p.frame_depth * 0.35);
    pad.rotation.z = side * THREE.MathUtils.degToRad(10);
    modelGroup.add(pad);
  });
  addTriangles(geometry, 2);
}

function addTemple(side, p, material) {
  const center = (p.bridge_width + p.lens_width) / 2;
  const hingeX = side * (center + p.lens_width / 2 + p.rim_thickness + p.hinge_width / 2);
  const temple = new THREE.Group();
  temple.position.set(hingeX, p.lens_height * 0.28, -p.frame_depth * 0.08);
  temple.rotation.y = side * THREE.MathUtils.degToRad(p.temple_spread);

  const hingeGeometry = roundedPrismGeometry(p.hinge_width, p.rim_thickness * 1.7, p.frame_depth * 1.2, p.rim_thickness * 0.32, p.bevel * 0.6);
  const hinge = new THREE.Mesh(hingeGeometry, material);
  temple.add(hinge);
  addTriangles(hingeGeometry);

  addHingeBarrels(side, p, temple, material);

  const armGeometry = roundedPrismGeometry(p.rim_thickness * 1.25, p.rim_thickness * 1.05, p.temple_length, p.rim_thickness * 0.32, p.bevel * 0.5);
  const arm = new THREE.Mesh(armGeometry, material);
  arm.position.set(side * p.hinge_width * 0.34, 0.2, -p.temple_length / 2 - p.frame_depth * 0.5);
  temple.add(arm);
  addTriangles(armGeometry);

  const hookGeometry = roundedPrismGeometry(p.rim_thickness * 1.3, p.rim_thickness * 1.05, Math.max(1, p.temple_drop), p.rim_thickness * 0.32, p.bevel * 0.5);
  const hook = new THREE.Mesh(hookGeometry, material);
  hook.position.set(side * p.hinge_width * 0.34, -p.temple_drop * 0.28, -p.temple_length - p.frame_depth * 0.5 - p.temple_drop * 0.28);
  hook.rotation.x = THREE.MathUtils.degToRad(-28);
  temple.add(hook);
  addTriangles(hookGeometry);

  modelGroup.add(temple);
}

function addHingeBarrels(side, p, temple, material) {
  const barrelGeometry = new THREE.CylinderGeometry(p.rim_thickness * 0.34, p.rim_thickness * 0.34, p.hinge_width * 0.95, 20);
  [-1, 1].forEach((slot) => {
    const barrel = new THREE.Mesh(barrelGeometry, material);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(side * p.hinge_width * 0.52, slot * p.rim_thickness * 0.42, -p.frame_depth * 0.78);
    temple.add(barrel);
  });
  addTriangles(barrelGeometry, 2);

  const pinMaterial = new THREE.MeshStandardMaterial({ color: "#1b1713", roughness: 0.34, metalness: 0.2 });
  const pinGeometry = new THREE.CylinderGeometry(p.rim_thickness * 0.13, p.rim_thickness * 0.13, p.hinge_width * 1.15, 16);
  const pin = new THREE.Mesh(pinGeometry, pinMaterial);
  pin.rotation.z = Math.PI / 2;
  pin.position.set(side * p.hinge_width * 0.52, 0, -p.frame_depth * 0.78);
  temple.add(pin);
  addTriangles(pinGeometry);
}

function roundedPrismGeometry(width, height, depth, radius, bevel) {
  const geometry = new THREE.ExtrudeGeometry(roundedRectShape(width, height, radius), {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: Math.max(0.01, bevel),
    bevelSize: Math.max(0.01, bevel),
    bevelSegments: bevel > 0 ? 2 : 0
  });
  geometry.center();
  return geometry;
}

function renderMeshObject(object) {
  const clone = object.clone(true);
  const material = new THREE.MeshStandardMaterial({
    color: state.frameColor,
    roughness: 0.46,
    metalness: 0.04
  });
  clone.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry.computeVertexNormals();
    child.material = material;
    addTriangles(child.geometry);
  });
  modelGroup.add(clone);
  centerObjectForViewerPivot(modelGroup);
  modelBasePosition.copy(modelGroup.position);
  applyViewerTransform();
}

function roundedRectShape(width, height, radius) {
  const r = Math.min(radius, width / 2 - 0.01, height / 2 - 0.01);
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

function createDefaultModel() {
  const seed = seedCollections[0];
  return {
    id: defaultModelId,
    name: seed.name,
    category: seed.category,
    description: seed.description,
    scadSource: sampleScad,
    params: { ...structuredClone(defaultParams), ...seed.params },
    lensMode: "none",
    thumbnail: "",
    components: null,
    assembly: null,
    order: seed.order || 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function publicBootBrandSettings() {
  const settings = window.frameLabPublicBoot?.settings;
  return settings && typeof settings === "object" ? settings : null;
}

function publicBootCollections() {
  const collections = window.frameLabPublicBoot?.collections;
  return Array.isArray(collections)
    ? collections.map(normalizeStoredModel).filter(Boolean)
    : [];
}

async function loadStoredModels() {
  const bootCollections = publicBootCollections();
  if (bootCollections.length) {
    const canonical = mergeSeedCollections(bootCollections);
    writeModelsToLocalCache(canonical);
    return canonical;
  }
  const remote = await fetchBackendCollections();
  if (remote.length) {
    const canonical = mergeSeedCollections(remote);
    writeModelsToLocalCache(canonical);
    return canonical;
  }
  try {
    const parsed = JSON.parse(getLocalStorageItem(modelStorageKey, "[]") || "[]");
    const stored = Array.isArray(parsed)
      ? parsed.map(normalizeStoredModel).filter((model) => model && !legacyModelIds.has(model.id))
      : [];
    const merged = mergeSeedCollections(stored);
    writeModelsToLocalCache(merged);
    return merged;
  } catch {
    return mergeSeedCollections([]);
  }
}

async function fetchBackendCollections() {
  try {
    const payload = await apiRequest("/api/collections");
    return Array.isArray(payload.collections)
      ? payload.collections.map(normalizeStoredModel).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function mergeModelCollections(localModels, remoteModels) {
  const byId = new Map();
  [...localModels, ...remoteModels].forEach((model) => {
    const existing = byId.get(model.id);
    if (!existing || Number(model.updatedAt || 0) >= Number(existing.updatedAt || 0)) {
      byId.set(model.id, model);
    }
  });
  return [...byId.values()];
}

function mergeSeedCollections(stored) {
  const byId = new Map(stored.map((model) => [model.id, model]));
  seedCollections.forEach((seed) => {
    if (byId.has(seed.id)) return;
    byId.set(seed.id, normalizeStoredModel({
      id: seed.id,
      name: seed.name,
      category: seed.category,
      access: seed.access,
      description: seed.description,
      scadSource: sampleScad,
      params: { ...structuredClone(defaultParams), ...seed.params },
      lensMode: "none",
      thumbnail: "",
      order: seed.order || 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));
  });
  return [...byId.values()].sort((a, b) => {
    const categoryOrder = categoryRank(a.category) - categoryRank(b.category);
    if (categoryOrder) return categoryOrder;
    const order = Number(a.order || 0) - Number(b.order || 0);
    if (order) return order;
    return a.createdAt - b.createdAt;
  });
}

function categoryRank(category) {
  return category === "sun" ? 0 : 1;
}

function normalizeStoredModel(model) {
  if (!model || typeof model !== "object") return null;
  const name = String(model.name || "Model OpenSCAD").trim() || "Model OpenSCAD";
  const category = model.category === "optical" ? "optical" : "sun";
  const access = ["free", "basic", "pro", "studio"].includes(model.access) ? model.access : "basic";
  const description = String(model.description || "").trim();
  const storedScadSource = typeof model.scadSource === "string" ? model.scadSource : "";
  const scadSource = storedScadSource || sampleScad;
  const params = { ...structuredClone(defaultParams), ...(model.params || parseScadParameters(scadSource)) };
  const designInput = model.design && typeof model.design === "object"
    ? mergeDesignConstructionFromScad(model.design, storedScadSource)
    : null;
  return {
    id: String(model.id || crypto.randomUUID()),
    name,
    category,
    access,
    description,
    scadSource,
    params,
    design: designInput ? normalizeParametricDesign(designInput) : null,
    lensMode: validLensMode(model.lensMode),
    thumbnail: typeof model.thumbnail === "string" ? model.thumbnail : "",
    thumbnailSource: model.thumbnailSource === "custom" ? "custom" : (model.thumbnailSource === "creator" ? "creator" : ""),
    components: normalizeModelComponents(model.components),
    assembly: model.assembly && typeof model.assembly === "object" ? model.assembly : null,
    order: Number.isFinite(Number(model.order)) ? Number(model.order) : 0,
    createdAt: Number(model.createdAt) || Date.now(),
    updatedAt: Number(model.updatedAt) || Date.now()
  };
}

function readScadNumberLiteral(source, key) {
  const value = String(source || "").match(new RegExp(`(?:^|\\n)\\s*${key}\\s*=\\s*(-?\\d*\\.?\\d+)\\s*;`))?.[1];
  if (value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function readScadBooleanLiteral(source, key) {
  const value = String(source || "").match(new RegExp(`(?:^|\\n)\\s*${key}\\s*=\\s*(true|false)\\s*;`))?.[1];
  return value === undefined ? undefined : value === "true";
}

function readScadArrayLiteral(source, key) {
  return String(source || "").match(new RegExp(`(?:^|\\n)\\s*${key}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*;`))?.[1] || "";
}

function boundedScadLiteralNumber(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? THREE.MathUtils.clamp(number, min, max) : null;
}

function readScadPointListLiteral(source, key, bounds, limit) {
  const [minX, maxX, minY, maxY] = bounds;
  return [...readScadArrayLiteral(source, key).matchAll(/\[\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\]/g)]
    .slice(0, limit)
    .map((match) => [
      boundedScadLiteralNumber(match[1], minX, maxX),
      boundedScadLiteralNumber(match[2], minY, maxY)
    ])
    .filter(([x, y]) => x !== null && y !== null);
}

function readScadNumberListLiteral(source, key, min, max, limit) {
  return [...readScadArrayLiteral(source, key).matchAll(/-?\d*\.?\d+/g)]
    .slice(0, limit)
    .map((match) => boundedScadLiteralNumber(match[0], min, max))
    .filter((number) => number !== null);
}

function mergeDesignConstructionFromScad(design, scadSource) {
  const construction = { ...(design.construction || {}) };
  const numberFields = {
    lensSeatWidth: "lens_seat_width",
    lensSeatDepth: "lens_seat_depth",
    lensClearance: "lens_clearance",
    lensChannelOffset: "lens_channel_offset",
    hingeMountHeight: "hinge_mount_height",
    hingeMountOffset: "hinge_mount_offset",
    bridgeThickness: "bridge_thickness",
    bridgeBlendRadius: "bridge_blend_radius",
    bridgeTopJoinOffset: "bridge_top_join_offset",
    bridgeBottomJoinOffset: "bridge_bottom_join_offset",
    noseWingHeight: "nose_wing_height",
    noseWingAngle: "nose_wing_angle",
    noseWingRound: "nose_wing_round",
    noseWingTopRound: "nose_wing_top_round",
    noseWingBaseRound: "nose_wing_base_round",
    noseWingTopOffset: "nose_wing_top_offset",
    noseWingBottomOffset: "nose_wing_bottom_offset",
    noseWingTopShift: "nose_wing_top_shift",
    noseWingBottomShift: "nose_wing_bottom_shift",
    noseWingTopOuterOffset: "nose_wing_top_outer_offset",
    noseWingTopInnerOffset: "nose_wing_top_inner_offset",
    noseWingBottomInnerOffset: "nose_wing_bottom_inner_offset",
    noseWingBottomOuterOffset: "nose_wing_bottom_outer_offset",
    topVisorDepth: "top_visor_depth",
    topVisorBandHeight: "top_visor_band_height",
    topVisorRadius: "top_visor_radius",
    topVisorStartX: "top_visor_start_x",
    topVisorEndX: "top_visor_end_x",
    templeStraight: "temple_straight",
    templeHook: "temple_hook",
    templeHookAngle: "temple_hook_angle",
    templeBarHeight: "temple_bar_height",
    templeDepth: "temple_depth",
    templeCornerRadius: "temple_corner_radius",
    templeChamferAmount: "temple_chamfer_amount",
    templeTextureDepth: "temple_texture_depth",
    templePatternStart: "temple_pattern_start",
    templePatternEnd: "temple_pattern_end",
    templePatternSpacing: "temple_pattern_spacing",
    templePatternSize: "temple_pattern_size",
    templeTextSize: "temple_text_size",
    templeTextPosition: "temple_text_position",
    templeTextYOffset: "temple_text_y_offset",
    templeTextDepth: "temple_text_depth"
  };
  Object.entries(numberFields).forEach(([field, key]) => {
    const number = readScadNumberLiteral(scadSource, key);
    if (number !== undefined) construction[field] = number;
  });
  const legacyNoseWingRound = readScadNumberLiteral(scadSource, "nose_wing_round");
  if (legacyNoseWingRound !== undefined) {
    if (readScadNumberLiteral(scadSource, "nose_wing_top_round") === undefined) {
      construction.noseWingTopRound = legacyNoseWingRound;
    }
    if (readScadNumberLiteral(scadSource, "nose_wing_base_round") === undefined) {
      construction.noseWingBaseRound = legacyNoseWingRound;
    }
  }
  const enabled = readScadBooleanLiteral(scadSource, "temple_chamfer_enabled");
  if (enabled !== undefined) construction.templeChamferEnabled = enabled;
  const topVisorEnabled = readScadBooleanLiteral(scadSource, "top_visor_enabled");
  if (topVisorEnabled !== undefined) construction.topVisorEnabled = topVisorEnabled;
  const nextDesign = { ...design, construction };
  const sketchPoints = readScadPointListLiteral(scadSource, "profile_points", [-0.7, 0.7, -0.7, 0.7], 20);
  if (sketchPoints.length >= 4) {
    const cornerRadii = readScadNumberListLiteral(scadSource, "profile_corner_radii", 0, 30, sketchPoints.length);
    nextDesign.sketch = {
      ...(design.sketch || {}),
      points: sketchPoints,
      cornerRadii: cornerRadii.length ? cornerRadii : design.sketch?.cornerRadii
    };
  }
  const templePoints = readScadPointListLiteral(scadSource, "temple_profile_points", [0, 150, -80, 20], 24);
  if (templePoints.length >= 4) {
    const cornerRadii = readScadNumberListLiteral(scadSource, "temple_profile_corner_radii", 0, 12, templePoints.length);
    nextDesign.templeSketch = {
      ...(design.templeSketch || {}),
      points: templePoints,
      cornerRadii: cornerRadii.length ? cornerRadii : design.templeSketch?.cornerRadii
    };
  }
  return nextDesign;
}

function persistModels(options = {}) {
  writeModelsToLocalCache(state.models);
  if (options.syncBackend !== false) scheduleCollectionsBackendSync();
}

function writeModelsToLocalCache(models) {
  const variants = [
    models,
    compactModelsForLocalCache(models, 1),
    compactModelsForLocalCache(models, 2)
  ];
  for (const variant of variants) {
    try {
      const result = setLocalStorageItem(modelStorageKey, JSON.stringify(variant));
      if (!result.ok) {
        if (result.error && isStorageQuotaError(result.error)) continue;
        return false;
      }
      return true;
    } catch (error) {
      if (!isStorageQuotaError(error)) return false;
    }
  }
  removeLocalStorageItem(modelStorageKey);
  return false;
}

function compactModelsForLocalCache(models, level = 1) {
  return models.map((model) => {
    const compact = {
      ...model,
      thumbnail: ""
    };
    if (level >= 2 && compact.design) {
      compact.scadSource = "";
    }
    return compact;
  });
}

function isStorageQuotaError(error) {
  return error?.name === "QuotaExceededError" || error?.name === "NS_ERROR_DOM_QUOTA_REACHED" || error?.code === 22 || error?.code === 1014;
}

function scheduleCollectionsBackendSync() {
  if (!isDeveloper() || !sessionToken()) return;
  clearTimeout(backendPersistTimer);
  backendPersistTimer = setTimeout(() => {
    syncCollectionsToBackend().catch((error) => log(error.message || "Could not save collections to backend."));
  }, 800);
}

async function syncCollectionsToBackend(options = {}) {
  if (!isDeveloper() || !sessionToken()) return false;
  await apiRequest("/api/collections", {
    method: "PUT",
    body: JSON.stringify({ collections: state.models })
  });
  if (options.announce) log("Developer changes saved to backend.");
  return true;
}

function currentModelRecord() {
  return state.models.find((model) => model.id === state.activeModelId);
}

function activeEditableModelRecord() {
  return state.models.find((model) => model.id === state.editingModelId) || currentModelRecord();
}

function selectModel(id, options = {}) {
  const { rebuildControls = true, renderScene = true, logSelection = true, captureThumbnail = false } = options;
  const model = state.models.find((item) => item.id === id) || state.models[0] || createDefaultModel();
  if (!state.models.includes(model)) state.models.unshift(model);
  if (state.activeModelId !== model.id) {
    state.openComponentOptions = { front: true };
  }
  closeColorPickerEditor({ rebuild: false });
  state.activeModelId = model.id;
  state.modelName = model.name;
  state.scadSource = model.scadSource;
  state.params = { ...structuredClone(defaultParams), ...model.params };
  state.activeParametricDesign = model.design ? normalizeParametricDesign(model.design) : null;
  if (state.activeParametricDesign) {
    Object.entries(state.activeParametricDesign.sliderRanges).forEach(([key, range]) => {
      if (!state.activeParametricDesign.publicParameters.includes(key)) return;
      state.params[key] = THREE.MathUtils.clamp(Number(state.params[key]) || range.min, range.min, range.max);
    });
  }
  rebuildComponentLibrary();
  repairAssemblyForActiveModel(model);
  applyAssemblyToParams();
  state.lensMode = selectedLens() ? "component" : "none";
  state.meshObject = null;
  state.previewMode = "parametric";
  if (rebuildControls) {
    buildBuilderControls();
    buildControls();
  }
  updateGeneratedSource();
  if (renderScene) {
    render();
    if (captureThumbnail) queueThumbnailCapture();
  }
  renderGallery();
  if (logSelection) log(`Loaded model: ${model.name}.`);
}

function syncActiveModel(options = {}) {
  const { persist = true, thumbnail = null } = options;
  const model = currentModelRecord();
  if (!model) return;
  model.name = state.modelName;
  model.params = { ...state.params };
  model.scadSource = generateScadSource();
  model.lensMode = selectedLens() ? "component" : "none";
  model.assembly = serializeAssemblySelection();
  model.updatedAt = Date.now();
  if (thumbnail !== null && model.thumbnailSource !== "custom") {
    model.thumbnail = thumbnail;
    model.thumbnailSource = "creator";
  }
  if (persist) {
    persistModels();
    renderGallery();
  }
}

function scheduleModelPersist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    syncActiveModel();
  }, 350);
}

function setActiveSection(section) {
  if (section === "studio") section = "developer";
  if (section === "developer" && !isDeveloper()) section = "home";
  if (section === "collection-editor" && !isDeveloper()) section = "home";
  if (section === "licenses" && !isDeveloper()) section = "home";
  const showEditor = section === "configurator";
  const showDesignLab = section === "design-lab";
  const showStudio = section === "developer";
  const showCollectionEditor = section === "collection-editor";
  const showLicenses = section === "licenses";
  els.homePage.hidden = showEditor || showDesignLab || showStudio || showCollectionEditor || showLicenses;
  els.workspace.hidden = !showEditor;
  els.designLab.hidden = !showDesignLab;
  els.studioPanel.hidden = !showStudio || !isDeveloper();
  els.collectionEditorPanel.hidden = !showCollectionEditor || !isDeveloper();
  els.licensePanel.hidden = !showLicenses || !isDeveloper();
  if (section === "home") {
    setActiveHomeLink("#top");
  } else {
    document.querySelectorAll(".topbar-tabs .nav-link").forEach((link) => link.classList.remove("active"));
    els.openStudio.classList.toggle("active", (showStudio || showCollectionEditor) && isDeveloper());
    els.openLicenses.classList.toggle("active", showLicenses && isDeveloper());
  }
  if (showEditor) {
    resize();
    render();
  }
  if (showDesignLab) {
    requestAnimationFrame(() => {
      resizeDesignScene();
      renderDesignPreview({ fitView: true });
      loadMyDesignSubmissions();
    });
  }
  if (showStudio) {
    loadDesignSubmissions();
  }
  return section;
}

function homeNavigationEntries() {
  return [
    { selector: "#top", element: document.querySelector(".hero-page"), link: els.openHome },
    { selector: "#galleryPanel", element: els.galleryPanel, link: els.openGallery },
    { selector: "#plansPublicPanel", element: document.querySelector("#plansPublicPanel"), link: els.plansButton },
    { selector: "#printGuidePanel", element: document.querySelector("#printGuidePanel"), link: els.openPrintGuide },
    { selector: "#roadmapPanel", element: document.querySelector("#roadmapPanel"), link: els.openRoadmap },
    { selector: "#licenseInfoPanel", element: document.querySelector("#licenseInfoPanel"), link: els.openLicenseInfo },
    { selector: "#faqPanel", element: document.querySelector("#faqPanel"), link: els.openFaq }
  ].filter((entry) => entry.element && entry.link);
}

function setActiveHomeLink(selector) {
  document.querySelectorAll(".topbar-tabs .nav-link").forEach((link) => link.classList.remove("active"));
  const entry = homeNavigationEntries().find((item) => item.selector === selector);
  (entry?.link || els.openHome).classList.add("active");
}

function routeForView(section) {
  return {
    configurator: "#configurator",
    "design-lab": "#design-lab",
    developer: "#developer",
    "collection-editor": "#frame-editor",
    licenses: "#codes"
  }[section] || "#top";
}

function updateNavigationHistory(hash, options = {}) {
  if (window.location.hash === hash && !options.replace) return;
  const method = options.replace ? "replaceState" : "pushState";
  window.history[method]({ frameLabRoute: hash }, "", hash);
}

function navigateToView(section, options = {}) {
  if ((section === "configurator" || section === "design-lab") && !canOpenCreator()) {
    scrollHomeSection("#plansPublicPanel", { replace: options.replace });
    return;
  }
  const activeSection = setActiveSection(section);
  updateNavigationHistory(routeForView(activeSection), options);
  if (activeSection !== "home") window.scrollTo({ top: 0, behavior: "auto" });
}

function scrollGalleryIntoView(options = {}) {
  scrollHomeSection("#galleryPanel", options);
}

function scrollHomeSection(selector, options = {}) {
  const targetSelector = homeNavigationEntries().some((entry) => entry.selector === selector) ? selector : "#top";
  setActiveSection("home");
  setActiveHomeLink(targetSelector);
  if (options.history !== false) updateNavigationHistory(targetSelector, { replace: options.replace });
  const target = targetSelector === "#top" ? document.querySelector(".hero-page") : document.querySelector(targetSelector);
  scrollToPageTarget(target, options.behavior || "smooth");
}

function scrollToPageTarget(target, behavior = "smooth") {
  if (!target) return;
  const topbarOffset = (els.topbar?.offsetHeight || 72) + 10;
  target.style.scrollMarginTop = `${topbarOffset}px`;
  target.scrollIntoView({ behavior, block: "start" });
}

function goHome() {
  scrollHomeSection("#top");
}

function syncActiveHomeSection() {
  if (els.homePage.hidden) return;
  const entries = homeNavigationEntries();
  const marker = (els.topbar?.offsetHeight || 72) + Math.min(window.innerHeight * 0.22, 180);
  let active = entries[0];
  entries.forEach((entry) => {
    if (entry.element.getBoundingClientRect().top <= marker) active = entry;
  });
  if (active) setActiveHomeLink(active.selector);
}

function restoreNavigationRoute() {
  if (els.imageLightbox && !els.imageLightbox.hidden) closePrintGuideLightbox({ restoreFocus: false });
  const viewSections = {
    "#configurator": "configurator",
    "#design-lab": "design-lab",
    "#developer": "developer",
    "#frame-editor": "collection-editor",
    "#codes": "licenses"
  };
  const view = viewSections[window.location.hash];
  if ((view === "configurator" || view === "design-lab") && !hasCreatorAccess()) {
    scrollHomeSection("#plansPublicPanel", { history: false, behavior: "auto" });
    openPlansPanel("Activate a Creator plan to open collections, use Creator and export production files.");
    updateNavigationHistory("#plansPublicPanel", { replace: true });
    return;
  }
  if (view) {
    const activeSection = setActiveSection(view);
    if (activeSection !== view) updateNavigationHistory("#top", { replace: true });
    window.scrollTo({ top: 0, behavior: "auto" });
    return;
  }
  const selector = homeNavigationEntries().some((entry) => entry.selector === window.location.hash)
    ? window.location.hash
    : "#top";
  if (selector === "#top" && window.location.hash !== selector) updateNavigationHistory(selector, { replace: true });
  scrollHomeSection(selector, { history: false, behavior: "auto" });
}

function setupNavigation() {
  if (navigationBound) {
    restoreNavigationRoute();
    return;
  }
  navigationBound = true;
  const initialHash = window.location.hash || "#top";
  updateNavigationHistory(initialHash, { replace: true });
  window.addEventListener("popstate", restoreNavigationRoute);
  window.addEventListener("scroll", () => {
    if (navigationScrollFrame !== null) return;
    navigationScrollFrame = requestAnimationFrame(() => {
      navigationScrollFrame = null;
      syncActiveHomeSection();
    });
  }, { passive: true });
  restoreNavigationRoute();
}

function openPrintGuideLightbox() {
  if (!els.imageLightbox || !els.printGuideImage?.src || els.printGuideFigure?.hidden) return;
  els.lightboxImage.src = els.printGuideImage.src;
  els.imageLightbox.hidden = false;
  document.body.classList.add("lightbox-open");
  els.closeImageLightbox?.focus();
}

function closePrintGuideLightbox(options = {}) {
  if (!els.imageLightbox || els.imageLightbox.hidden) return;
  els.imageLightbox.hidden = true;
  document.body.classList.remove("lightbox-open");
  if (options.restoreFocus !== false) els.openPrintGuideImage?.focus();
}

async function handleHeroImageSelect() {
  const file = els.heroImageInput?.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    if (els.brandSettingsNote) els.brandSettingsNote.textContent = "Choose an image file for the hero.";
    return;
  }
  state.brandSettings.heroImage = await readFileAsDataUrl(file);
  applyBrandSettings();
  if (els.brandSettingsNote) els.brandSettingsNote.textContent = "Previewing hero image. Save to publish it.";
}

async function handlePrintGuideImageSelect(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    if (els.brandSettingsNote) els.brandSettingsNote.textContent = "Choose an image file for the print guide.";
    return;
  }
  state.brandSettings.content = normalizeContentSettings({
    ...state.brandSettings.content,
    printGuide: {
      ...state.brandSettings.content.printGuide,
      image: await readFileAsDataUrl(file)
    }
  });
  applyBrandSettings();
  if (els.brandSettingsNote) els.brandSettingsNote.textContent = "Previewing print guide image. Save to publish it.";
}

function sessionToken() {
  return getLocalStorageItem(sessionStorageKey, "") || "";
}

async function apiRequest(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const token = sessionToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Backend request failed.");
  return payload;
}

function accountFromUser(user) {
  if (!user) return { email: "", firstName: "", lastName: "", plan: "free", role: "visitor", subscriptionMode: "free", subscriptionStatus: "none", planEndsAt: null, measurements: sanitizeMeasurements({}) };
  return {
    email: String(user.email || "").toLowerCase(),
    firstName: String(user.firstName || ""),
    lastName: String(user.lastName || ""),
    plan: validAccountPlan(user.plan) ? user.plan : "free",
    role: user.role === "developer" ? "developer" : "customer",
    subscriptionMode: user.subscriptionMode || "free",
    subscriptionStatus: user.subscriptionStatus || "none",
    planEndsAt: user.planEndsAt || null,
    measurements: sanitizeMeasurements(user.measurements || {})
  };
}

function sanitizeMeasurements(measurements = {}) {
  const numeric = (value, min, max) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : null;
  };
  return {
    headWidth: numeric(measurements.headWidth, 90, 220),
    bridgeWidth: numeric(measurements.bridgeWidth, 8, 34),
    templeLength: numeric(measurements.templeLength, 100, 190),
    updatedAt: measurements.updatedAt || null
  };
}

async function hydrateSessionFromBackend() {
  if (!sessionToken()) return false;
  try {
    const payload = await apiRequest("/api/session");
    state.account = accountFromUser(payload.user);
    await Promise.all([loadDownloadQuota({ silent: true }), loadDownloadFolder({ silent: true })]);
    if (isDeveloper()) await Promise.all([loadStaticLicenseCodes({ silent: true }), loadLicenseCodes({ silent: true })]);
    persistActiveAccount({ skipProfile: true });
    return true;
  } catch {
    removeLocalStorageItem(sessionStorageKey);
    removeLocalStorageItem(accountStorageKey);
    state.account = accountFromUser(null);
    state.downloadQuota = null;
    return false;
  }
}

function isDeveloper() {
  return state.account.role === "developer";
}

function isAdminEmail(email) {
  return adminEmails.has(String(email || "").toLowerCase());
}

function validAccountPlan(plan) {
  return Object.prototype.hasOwnProperty.call(planRank, plan);
}

function modelAccessPlan(access) {
  if (access === "studio") return "studio";
  if (access === "pro") return "pro";
  return "basic";
}

function hasCreatorAccess() {
  if (isDeveloper()) return true;
  const endsAt = state.account.planEndsAt ? new Date(state.account.planEndsAt) : null;
  if (endsAt && !Number.isNaN(endsAt.getTime()) && endsAt <= new Date()) return false;
  return planRank[state.account.plan] > planRank.free;
}

function canOpenCreator(message = "Activate a Creator plan to open collections, use Creator and export production files.") {
  if (hasCreatorAccess()) return true;
  openPlansPanel(message);
  log(message);
  return false;
}

function canAccessModel(model) {
  return hasCreatorAccess();
}

function accessLabel(access) {
  return planLabel(modelAccessPlan(access));
}

function planLabel(plan) {
  if (plan === "studio") return "Ultra Support";
  if (plan === "pro") return "Commercial";
  if (plan === "basic") return "Personal";
  return "No plan";
}

function validLensMode(value) {
  return value === "component" ? "component" : "none";
}

function selectedLensLabel() {
  return selectedLens()?.name || "No lenses";
}

function lensModeLabel() {
  return selectedLensLabel();
}

function accountLabel() {
  if (isDeveloper()) return "Developer";
  if (state.account.role === "visitor" || !state.account.email) return "Login";
  return "Account";
}

function openPlansPanel(message = "") {
  if (els.plansContext) {
    els.plansContext.textContent = message;
    els.plansContext.hidden = !message;
  }
  renderPlanCards();
  els.plansPanel.hidden = false;
  els.plansButton?.classList.add("active");
}

function setAuthMode(mode) {
  state.authMode = mode === "register" ? "register" : "login";
  const isRegister = state.authMode === "register";
  els.authModeButtons.forEach((button) => button.classList.toggle("active", button.dataset.authMode === state.authMode));
  els.nameFields.hidden = !isRegister;
  els.confirmPasswordField.hidden = !isRegister;
  els.registrationCodeField.hidden = !isRegister;
  els.authTitle.textContent = isRegister ? "Create account" : "Login";
  els.signInAccount.textContent = isRegister ? "Create account" : "Login";
  els.accountPassword.autocomplete = isRegister ? "new-password" : "current-password";
  els.accountNote.textContent = "";
}

function togglePasswordVisibility(button) {
  const input = document.querySelector(`#${button.dataset.passwordToggle}`);
  if (!input) return;
  const visible = input.type === "text";
  input.type = visible ? "password" : "text";
  button.textContent = visible ? "Show" : "Hide";
}

function updateAccountUi() {
  if (!els.accountButton) return;
  const signedIn = state.account.role !== "visitor" && Boolean(state.account.email);
  els.accountButton.textContent = accountLabel();
  els.accountButton.classList.toggle("developer", isDeveloper());
  els.openStudio.hidden = !isDeveloper();
  els.openLicenses.hidden = !isDeveloper();
  if (els.saveDesignCollection) els.saveDesignCollection.hidden = !isDeveloper();
  if (els.submitDesign) els.submitDesign.hidden = isDeveloper();
  updateDesignPublishingAccess();
  els.studioPanel.hidden = els.studioPanel.hidden || !isDeveloper();
  els.collectionEditorPanel.hidden = els.collectionEditorPanel.hidden || !isDeveloper();
  els.licensePanel.hidden = els.licensePanel.hidden || !isDeveloper();
  els.accountEmail.value = state.account.email;
  els.authForm.hidden = signedIn;
  els.accountProfile.hidden = !signedIn;
  els.cancelSubscription.hidden = true;
  if (!signedIn) setAuthMode(state.authMode);
  if (signedIn) {
    els.profileEmail.textContent = state.account.email;
    els.profileName.textContent = [state.account.firstName, state.account.lastName].filter(Boolean).join(" ") || "Customer";
    els.profileRole.textContent = isDeveloper() ? "Developer account" : "Customer account";
    els.profilePlan.textContent = planLabel(state.account.plan);
    els.profileStatus.textContent = subscriptionStatusLabel();
    if (els.profileExports) els.profileExports.textContent = downloadQuotaLabel();
    syncFitProfileUi();
    els.cancelSubscription.hidden = isDeveloper() || state.account.subscriptionMode !== "subscription";
    els.cancelSubscription.disabled = state.account.subscriptionStatus !== "active";
  }
  els.planButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.plan === state.account.plan);
    button.disabled = isDeveloper() && button.dataset.plan !== "studio";
  });
  els.accountNote.textContent = isDeveloper()
    ? t("accountDeveloperNote")
    : state.account.plan === "studio"
      ? t("accountPlusNote")
      : state.account.plan === "pro"
        ? t("accountProNote")
        : state.account.plan === "basic"
          ? t("accountBasicNote")
          : t("accountFreeNote");
  renderPlanCards();
  renderStorageStatus();
  renderDownloadFolder();
  renderStaticLicenseCodeList();
  renderLicenseCodeList();
  renderContentEditors();
  renderGallery();
}

function renderDownloadFolder() {
  if (!els.downloadFolder) return;
  if (els.profileExports) els.profileExports.textContent = downloadQuotaLabel();
  const signedIn = state.account.role !== "visitor" && Boolean(state.account.email);
  if (!signedIn) {
    els.downloadFolder.innerHTML = "";
    return;
  }
  if (!state.downloads.length) {
    els.downloadFolder.innerHTML = `
      <div class="download-empty">
        <strong>No downloaded configurations yet.</strong>
        <small>Your exported 3MF setups will appear here.</small>
      </div>
    `;
    return;
  }
  els.downloadFolder.innerHTML = state.downloads.slice(0, 12).map((item) => {
    const parameters = item.configuration?.parameters || {};
    const chips = [
      ["Head", parameters.head_width, "mm"],
      ["Bridge", parameters.bridge_width, "mm"],
      ["Temples", parameters.temple_length, "mm"]
    ].filter(([, value]) => Number.isFinite(Number(value))).map(([label, value, unit]) => `
      <span>${label} ${formatNumber(value)}${unit}</span>
    `).join("");
    return `
      <article class="download-item">
        <div>
          <strong>${escapeHtml(item.modelName)}</strong>
          <small>${escapeHtml(item.fileName)} · ${downloadDateLabel(item.createdAt)}</small>
        </div>
        <div class="download-tags">
          <span>${escapeHtml(accessLabel(item.plan))}</span>
          <span>${escapeHtml(downloadLensLabel(item))}</span>
          ${chips}
        </div>
      </article>
    `;
  }).join("");
}

function downloadLensLabel(item) {
  const configurationLens = item.configuration?.lens;
  if (configurationLens?.mode === "component" && configurationLens.label) return configurationLens.label;
  if (item.lensMode === "component" && item.lensLabel) return item.lensLabel;
  return "No lenses";
}

function downloadQuotaLabel() {
  if (isDeveloper()) return "Unlimited";
  if (state.account.role === "visitor" || !state.account.email) return "Plan required";
  if (state.account.plan === "free") return "Plan required";
  return "Unlimited";
}

function syncFitProfileUi() {
  const measurements = sanitizeMeasurements(state.account.measurements || {});
  if (els.accountHeadWidth) els.accountHeadWidth.value = measurements.headWidth || "";
  if (els.accountBridgeWidth) els.accountBridgeWidth.value = measurements.bridgeWidth || "";
  if (els.accountTempleLength) els.accountTempleLength.value = measurements.templeLength || "";
  renderFitRecommendation();
}

function recommendedSize(measurements = state.account.measurements) {
  const fit = sanitizeMeasurements(measurements || {});
  const rows = normalizeContentSettings(state.brandSettings.content).sizes.rows;
  if (!fit.headWidth && !fit.bridgeWidth && !fit.templeLength) return null;
  const scoreValue = (value, min, max) => {
    if (!Number.isFinite(Number(value))) return 0;
    if (value >= min && value <= max) return 3;
    const distance = value < min ? min - value : value - max;
    if (distance <= 3) return 1.4;
    if (distance <= 7) return 0.5;
    return -1;
  };
  const ranked = rows.map((row) => ({
    row,
    score:
      scoreValue(fit.headWidth, row.headMin, row.headMax) * 1.25 +
      scoreValue(fit.bridgeWidth, row.bridgeMin, row.bridgeMax) +
      scoreValue(fit.templeLength, row.templeMin, row.templeMax)
  })).sort((a, b) => b.score - a.score);
  return ranked[0]?.row || null;
}

function renderFitRecommendation() {
  if (!els.fitRecommendation) return;
  const suggestion = recommendedSize();
  els.fitRecommendation.textContent = suggestion
    ? `Recommended size: ${suggestion.size} (${suggestion.label}).`
    : "Add your measurements to get a size recommendation.";
}

async function saveFitProfile() {
  if (state.account.role === "visitor" || !sessionToken()) {
    els.accountNote.textContent = "Login first to save your fit profile.";
    return;
  }
  const measurements = sanitizeMeasurements({
    headWidth: els.accountHeadWidth?.value,
    bridgeWidth: els.accountBridgeWidth?.value,
    templeLength: els.accountTempleLength?.value
  });
  try {
    els.saveFitProfile.disabled = true;
    const payload = await apiRequest("/api/account/measurements", {
      method: "PUT",
      body: JSON.stringify({ measurements })
    });
    state.account = accountFromUser(payload.user);
    persistActiveAccount();
    syncFitProfileUi();
    log("Fit profile saved.");
  } catch (error) {
    if (els.fitRecommendation) els.fitRecommendation.textContent = error.message || "Could not save fit profile.";
  } finally {
    els.saveFitProfile.disabled = false;
  }
}

function downloadDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

async function loadDownloadFolder(options = {}) {
  if (!sessionToken() || state.account.role === "visitor") {
    state.downloads = [];
    renderDownloadFolder();
    return false;
  }
  try {
    const payload = await apiRequest("/api/downloads");
    state.downloads = Array.isArray(payload.downloads) ? payload.downloads : [];
    renderDownloadFolder();
    return true;
  } catch (error) {
    state.downloads = [];
    renderDownloadFolder();
    if (!options.silent) log(error.message || "Could not load download folder.");
    return false;
  }
}

async function loadDownloadQuota(options = {}) {
  if (!sessionToken() || state.account.role === "visitor") {
    state.downloadQuota = null;
    renderDownloadFolder();
    return false;
  }
  try {
    const payload = await apiRequest("/api/download-quota");
    state.downloadQuota = payload.quota || null;
    renderDownloadFolder();
    return true;
  } catch (error) {
    state.downloadQuota = null;
    renderDownloadFolder();
    if (!options.silent) log(error.message || "Could not load download quota.");
    return false;
  }
}

function normalizeLicenseCode(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 12);
}

function formatLicenseCode(value) {
  const digits = normalizeLicenseCode(value);
  return [digits.slice(0, 4), digits.slice(4, 8), digits.slice(8, 12)].filter(Boolean).join("-");
}

async function redeemLicenseCode(source = "account") {
  const isModalPlans = source === "plans";
  const isPublicPlans = source === "public-plans";
  const input = isPublicPlans
    ? els.publicPlanLicenseCodeInput
    : isModalPlans
      ? els.planLicenseCodeInput
      : els.licenseCodeInput;
  const note = isPublicPlans
    ? els.publicPlanLicenseCodeNote
    : isModalPlans
      ? els.planLicenseCodeNote
      : els.licenseCodeNote;
  const button = isPublicPlans
    ? els.redeemPublicPlanLicenseCode
    : isModalPlans
      ? els.redeemPlanLicenseCode
      : els.redeemLicenseCode;
  if (!input || !note || !button) return;
  const code = normalizeLicenseCode(input.value);
  if (state.account.role === "visitor") {
    note.textContent = "Complete local registration to activate this code.";
    els.accountPanel.hidden = false;
    setAuthMode("register");
    if (code.length === 12 && els.accountRegistrationCode) {
      els.accountRegistrationCode.value = formatLicenseCode(code);
    }
    els.accountEmail?.focus();
    return;
  }
  if (code.length !== 12) {
    note.textContent = "Enter a 12 digit activation code.";
    return;
  }
  try {
    button.disabled = true;
    note.textContent = "Activating code...";
    const payload = await apiRequest("/api/license-codes/redeem", {
      method: "POST",
      body: JSON.stringify({ code })
    });
    state.account = accountFromUser(payload.user);
    persistActiveAccount();
    input.value = "";
    [els.licenseCodeInput, els.planLicenseCodeInput, els.publicPlanLicenseCodeInput].forEach((codeInput) => {
      if (codeInput && codeInput !== input) codeInput.value = "";
    });
    const message = payload.message || "Code activated.";
    note.textContent = message;
    [els.licenseCodeNote, els.planLicenseCodeNote, els.publicPlanLicenseCodeNote].forEach((codeNote) => {
      if (codeNote && codeNote !== note) codeNote.textContent = message;
    });
    await loadDownloadQuota({ silent: true });
    if (isDeveloper()) await Promise.all([loadStaticLicenseCodes({ silent: true }), loadLicenseCodes({ silent: true })]);
    updateAccountUi();
    log(message);
  } catch (error) {
    note.textContent = error.message || "Could not activate code.";
  } finally {
    button.disabled = false;
  }
}

async function loadLicenseCodes(options = {}) {
  if (!isDeveloper() || !sessionToken()) {
    state.licenseCodes = [];
    renderLicenseCodeList();
    return false;
  }
  try {
    const payload = await apiRequest("/api/license-codes");
    state.licenseCodes = Array.isArray(payload.codes) ? payload.codes : [];
    renderLicenseCodeList();
    return true;
  } catch (error) {
    state.licenseCodes = [];
    renderLicenseCodeList();
    if (!options.silent && els.licenseAdminNote) els.licenseAdminNote.textContent = error.message || "Could not load license codes.";
    return false;
  }
}

async function loadStaticLicenseCodes(options = {}) {
  if (!isDeveloper() || !sessionToken()) {
    state.staticLicenseCodes = [];
    renderStaticLicenseCodeList();
    return false;
  }
  try {
    const payload = await apiRequest("/api/static-license-codes");
    state.staticLicenseCodes = Array.isArray(payload.codes) ? payload.codes : [];
    renderStaticLicenseCodeList();
    return true;
  } catch (error) {
    state.staticLicenseCodes = [];
    renderStaticLicenseCodeList();
    if (!options.silent && els.licenseAdminNote) els.licenseAdminNote.textContent = error.message || "Could not load static codes.";
    return false;
  }
}

async function generateLicenseCodes() {
  if (!isDeveloper()) return;
  const type = licenseCodeTypes[els.licenseCodeType.value] ? els.licenseCodeType.value : "commercial_year";
  const quantity = Math.min(50, Math.max(1, Number(els.licenseCodeQuantity.value) || 1));
  try {
    els.generateLicenseCodes.disabled = true;
    els.licenseAdminNote.textContent = "Generating codes...";
    const payload = await apiRequest("/api/license-codes", {
      method: "POST",
      body: JSON.stringify({ type, quantity })
    });
    const created = Array.isArray(payload.codes) ? payload.codes : [];
    state.licenseCodes = [...created, ...state.licenseCodes].slice(0, 500);
    renderLicenseCodeList();
    els.licenseAdminNote.textContent = `Generated ${created.length} ${licenseCodeTypes[type].label} code${created.length === 1 ? "" : "s"}.`;
  } catch (error) {
    els.licenseAdminNote.textContent = error.message || "Could not generate codes.";
  } finally {
    els.generateLicenseCodes.disabled = false;
  }
}

function renderStaticLicenseCodeList() {
  if (!els.staticLicenseCodeList) return;
  if (!isDeveloper()) {
    els.staticLicenseCodeList.innerHTML = "";
    return;
  }
  if (!state.staticLicenseCodes.length) {
    els.staticLicenseCodeList.innerHTML = `
      <div class="download-empty">
        <strong>No reusable codes configured.</strong>
        <small>The backend should expose one fixed code for each plan.</small>
      </div>
    `;
    return;
  }
  els.staticLicenseCodeList.innerHTML = state.staticLicenseCodes.map((item) => {
    const type = licenseCodeTypes[item.type] || licenseCodeTypes.ultra_support;
    return `
      <article class="license-code-item reusable">
        <div>
          <code>${escapeHtml(item.code)}</code>
          <small>${escapeHtml(item.label || type.label)} · fixed reusable access</small>
        </div>
        <div class="license-code-side">
          <div class="license-code-meta">
            <span>Reusable</span>
            <small>${escapeHtml(licenseAccessLabel(type))} · ${escapeHtml(licenseDurationLabel(type.duration))}</small>
          </div>
          <button
            type="button"
            class="license-code-pdf"
            data-license-certificate
            data-license-code="${escapeAttr(item.code)}"
            data-license-type="${escapeAttr(item.type)}"
            data-license-reusable="true"
          >PDF</button>
        </div>
      </article>
    `;
  }).join("");
}

function licenseDurationLabel(duration) {
  if (duration === "supporter") return "Support";
  if (duration === "lifetime") return "Lifetime";
  if (duration === "year") return "Yearly";
  return "Monthly";
}

function licenseAccessLabel(type = {}) {
  if (type.duration === "supporter") return "Supporter";
  return planLabel(type.plan);
}

function handleLicenseCertificateClick(event) {
  const button = event.target.closest("[data-license-certificate]");
  if (!button) return;
  event.preventDefault();
  downloadLicenseCertificate(button.dataset.licenseCode, button.dataset.licenseType, {
    reusable: button.dataset.licenseReusable === "true"
  });
}

function downloadLicenseCertificate(codeValue, typeKey, options = {}) {
  const code = formatLicenseCode(codeValue);
  const type = licenseCodeTypes[typeKey] || licenseCodeTypes.commercial_year;
  const plan = licenseCertificatePlanContent(typeKey, type);
  const blob = makeLicenseCertificatePdfBlob({ code, type, plan, reusable: options.reusable === true });
  const fileName = `${slugify(`${plan.name || type.label}-${normalizeLicenseCode(code)}`)}-certificate.pdf`;
  downloadBlob(fileName, blob);
  if (els.licenseAdminNote) {
    els.licenseAdminNote.textContent = `PDF certificate downloaded for ${plan.name || type.label}.`;
  }
}

function licenseCertificatePlanContent(typeKey, type = {}) {
  const content = normalizeContentSettings(state.brandSettings.content);
  const plan = content.plans.find((item) => item.plan === typeKey)
    || defaultContentSettings.plans.find((item) => item.plan === typeKey);
  if (plan) return plan;
  return {
    plan: typeKey,
    access: type.plan || "free",
    name: type.label || "Frame Lab access",
    price: "",
    period: licenseDurationLabel(type.duration),
    exports: type.duration === "supporter" ? "Support contribution" : "Creator access",
    description: type.duration === "supporter"
      ? "Support Frame Lab development without plan benefits."
      : "Creator access activated by code.",
    benefits: []
  };
}

function licenseCertificateBenefits(plan = {}, type = {}) {
  if (type.duration === "supporter" || plan.plan === "supporter") {
    return [
      "Thank you for backing Frame Lab development.",
      "Support contribution - no Creator access is included.",
      "Your support helps fund production-ready eyewear tools."
    ];
  }
  return normalizePlanBenefits(plan.benefits, [plan.exports, plan.description])
    .filter((benefit) => !/makerworld/i.test(benefit))
    .slice(0, 5);
}

function makeLicenseCertificatePdfBlob({ code, type, plan, reusable }) {
  const commands = [];
  const page = { width: 595.28, height: 841.89 };
  const accent = state.brandSettings.accentColor || defaultAccentColor;
  const cream = "#f4e5c7";
  const muted = "#aaa29a";
  const background = "#111211";
  const surface = "#1a1a18";
  const soft = "#2b2118";
  const line = "#3a332d";
  const benefits = licenseCertificateBenefits(plan, type);

  pdfRect(commands, page, 0, 0, page.width, page.height, background);
  pdfRect(commands, page, 0, 0, page.width, 18, accent);
  pdfRect(commands, page, 48, 58, 5, 118, accent);
  pdfRect(commands, page, 72, 600, 452, 1, line);
  pdfRect(commands, page, 44, 255, 507, 170, surface, line);
  pdfRect(commands, page, 58, 269, 479, 142, soft, accent);
  pdfRect(commands, page, 48, 702, 499, 72, surface, line);

  pdfText(commands, page, "Frame Lab", 72, 82, 24, "F2", cream);
  pdfText(commands, page, "Creator Access Certificate", 72, 112, 36, "F2", cream);
  pdfText(commands, page, "Thank you for supporting the Frame Lab project.", 72, 152, 14, "F2", accent);
  pdfWrappedText(commands, page, "Your contribution helps develop configurable 3D printed eyewear, cleaner exports and better production tooling for the maker community.", 72, 178, 425, 11, "F1", muted, 15);

  pdfText(commands, page, "TIER", 72, 228, 10, "F2", muted);
  pdfText(commands, page, plan.name || type.label, 72, 249, 20, "F2", cream);

  pdfCenteredText(commands, page, "ACTIVATION CODE", 58, 315, 479, 10, "F2", muted);
  pdfCenteredText(commands, page, code, 58, 369, 479, 36, "F3", cream);
  pdfCenteredText(commands, page, "Copy this code into Frame Lab to activate the plan.", 44, 444, 507, 10, "F1", muted);

  pdfText(commands, page, "Included", 72, 488, 18, "F2", cream);
  pdfBulletList(commands, page, benefits, 76, 520, 430, accent, muted);

  pdfText(commands, page, "Frame Lab note", 72, 645, 12, "F2", cream);
  pdfWrappedText(commands, page, pdfSafeText(plan.description || "Creator access activated by code."), 72, 668, 430, 11, "F1", muted, 15);

  pdfCenteredText(commands, page, "framelab.com.pl", 48, 742, 499, 14, "F2", accent);

  return buildSimplePdf(commands.join("\n"), page);
}

function buildSimplePdf(contentStream, page) {
  const encoder = new TextEncoder();
  const streamLength = encoder.encode(contentStream).length;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfNumber(page.width)} ${pdfNumber(page.height)}] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>",
    `<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(encoder.encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([encoder.encode(pdf)], { type: "application/pdf" });
}

function pdfRect(commands, page, x, y, width, height, fill, stroke = "") {
  const operation = stroke ? "B" : "f";
  commands.push([
    pdfFillColor(fill),
    stroke ? pdfStrokeColor(stroke) : "",
    `${pdfNumber(x)} ${pdfNumber(page.height - y - height)} ${pdfNumber(width)} ${pdfNumber(height)} re ${operation}`
  ].filter(Boolean).join(" "));
}

function pdfText(commands, page, text, x, y, size = 12, font = "F1", color = "#ffffff") {
  commands.push(`${pdfFillColor(color)} BT /${font} ${pdfNumber(size)} Tf ${pdfNumber(x)} ${pdfNumber(page.height - y)} Td (${pdfEscapeText(text)}) Tj ET`);
}

function pdfCenteredText(commands, page, text, x, y, width, size = 12, font = "F1", color = "#ffffff") {
  const safeText = pdfSafeText(text);
  const offset = Math.max(0, (width - pdfApproxTextWidth(safeText, size, font)) / 2);
  pdfText(commands, page, safeText, x + offset, y, size, font, color);
}

function pdfWrappedText(commands, page, text, x, y, maxWidth, size = 12, font = "F1", color = "#ffffff", lineHeight = size * 1.35) {
  const lines = pdfWrapText(text, maxWidth, size);
  lines.forEach((line, index) => pdfText(commands, page, line, x, y + index * lineHeight, size, font, color));
  return y + lines.length * lineHeight;
}

function pdfBulletList(commands, page, items, x, y, maxWidth, accent, color) {
  let cursor = y;
  items.forEach((item) => {
    pdfRect(commands, page, x, cursor - 7, 5, 5, accent);
    cursor = pdfWrappedText(commands, page, item, x + 18, cursor, maxWidth, 11, "F1", color, 17) + 8;
  });
  return cursor;
}

function pdfWrapText(value, maxWidth, size) {
  const words = pdfSafeText(value).split(/\s+/).filter(Boolean);
  const maxChars = Math.max(16, Math.floor(maxWidth / Math.max(1, size * 0.52)));
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function pdfApproxTextWidth(text, size, font = "F1") {
  const factor = font === "F3" ? 0.6 : font === "F2" ? 0.56 : 0.52;
  return pdfSafeText(text).length * size * factor;
}

function pdfSafeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pdfEscapeText(value) {
  return pdfSafeText(value).replace(/[\\()]/g, "\\$&");
}

function pdfNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/\.?0+$/, "");
}

function pdfFillColor(hex) {
  const { r, g, b } = pdfHexToRgb(hex);
  return `${pdfNumber(r / 255)} ${pdfNumber(g / 255)} ${pdfNumber(b / 255)} rg`;
}

function pdfStrokeColor(hex) {
  const { r, g, b } = pdfHexToRgb(hex);
  return `${pdfNumber(r / 255)} ${pdfNumber(g / 255)} ${pdfNumber(b / 255)} RG`;
}

function pdfHexToRgb(hex) {
  const clean = sanitizeHexColor(hex, defaultAccentColor).slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
}

function renderLicenseCodeList() {
  if (!els.licenseCodeList) return;
  if (!isDeveloper()) {
    els.licenseCodeList.innerHTML = "";
    return;
  }
  if (!state.licenseCodes.length) {
    els.licenseCodeList.innerHTML = `
      <div class="download-empty">
        <strong>No activation codes yet.</strong>
        <small>Generate a yearly or lifetime code to share with a customer.</small>
      </div>
    `;
    return;
  }
  els.licenseCodeList.innerHTML = state.licenseCodes.slice(0, 160).map((item) => {
    const type = licenseCodeTypes[item.type] || licenseCodeTypes.commercial_year;
    const redeemed = item.status === "redeemed";
    return `
      <article class="license-code-item ${redeemed ? "redeemed" : "active"}">
        <div>
          <code>${escapeHtml(item.code)}</code>
          <small>${escapeHtml(type.label)} · ${licenseDateLabel(item.createdAt)}</small>
        </div>
        <div class="license-code-side">
          <div class="license-code-meta">
            <span>${redeemed ? "Redeemed" : "Active"}</span>
            ${redeemed ? `<small>${escapeHtml(item.redeemedByEmail || "used")} · ${licenseDateLabel(item.redeemedAt)}</small>` : "<small>Ready to share</small>"}
          </div>
          <button
            type="button"
            class="license-code-pdf"
            data-license-certificate
            data-license-code="${escapeAttr(item.code)}"
            data-license-type="${escapeAttr(item.type)}"
            data-license-reusable="false"
          >PDF</button>
        </div>
      </article>
    `;
  }).join("");
}

function licenseDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "no date";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function subscriptionStatusLabel() {
  if (isDeveloper()) return "Developer access";
  const ends = state.account.planEndsAt ? new Date(state.account.planEndsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
  if (state.account.subscriptionStatus === "lifetime") return "Lifetime access";
  if (state.account.subscriptionStatus === "active") return ends ? `Subscription active until ${ends}` : "Subscription active";
  if (state.account.subscriptionStatus === "cancel_at_period_end") return ends ? `Cancels on ${ends}` : "Cancelling";
  if (state.account.subscriptionStatus === "expired") return ends ? `Access expired on ${ends}` : "Access expired";
  if (state.account.subscriptionMode === "supporter") return "Supporter";
  if (state.account.subscriptionMode === "license_year") return ends ? `Year access until ${ends}` : "Year access";
  if (state.account.subscriptionMode === "license_month") return ends ? `Code access until ${ends}` : "Code access";
  if (state.account.subscriptionStatus === "paid_once") return ends ? `Code access until ${ends}` : "Code access";
  return state.account.plan === "free" ? "No active plan" : "Active";
}

async function signInAccount() {
  const email = els.accountEmail.value.trim().toLowerCase();
  const password = els.accountPassword.value;
  const passwordConfirm = els.accountPasswordConfirm.value;
  const firstName = els.accountFirstName.value.trim();
  const lastName = els.accountLastName.value.trim();
  const activationCode = normalizeLicenseCode(els.accountRegistrationCode?.value);
  if (!email || !password) {
    els.accountNote.textContent = "Enter email and password to continue.";
    return;
  }
  if (state.authMode === "register") {
    if (!firstName || !lastName) {
      els.accountNote.textContent = "Enter first and last name.";
      return;
    }
    if (password.length < 6) {
      els.accountNote.textContent = "Password must have at least 6 characters.";
      return;
    }
    if (password !== passwordConfirm) {
      els.accountNote.textContent = "Passwords do not match.";
      return;
    }
    if (activationCode.length !== 12) {
      els.accountNote.textContent = "Enter the 12 digit activation code received with your purchase.";
      return;
    }
  }
  try {
    els.accountNote.textContent = state.authMode === "register" ? "Creating local account..." : "Opening local account...";
    const payload = await apiRequest("/api/auth/email", {
      method: "POST",
      body: JSON.stringify({ email, password, mode: state.authMode, firstName, lastName, code: activationCode })
    });
    setLocalStorageItem(sessionStorageKey, payload.token);
    state.account = accountFromUser(payload.user);
    await Promise.all([loadDownloadQuota({ silent: true }), loadDownloadFolder({ silent: true })]);
    if (isDeveloper()) await loadLicenseCodes({ silent: true });
  } catch (error) {
    els.accountNote.textContent = error.message || "Could not sign in.";
    return;
  }
  persistActiveAccount();
  updateAccountUi();
  els.accountPassword.value = "";
  els.accountPasswordConfirm.value = "";
  if (els.accountRegistrationCode) els.accountRegistrationCode.value = "";
  els.accountPanel.hidden = true;
  if (!isDeveloper() && !hasCreatorAccess()) openPlansPanel("Your local account does not currently have active Creator access.");
  log(`${email || "account"}: ${accountLabel()}.`);
}

async function signOutAccount() {
  try {
    if (sessionToken()) await apiRequest("/api/auth/sign-out", { method: "POST" });
  } catch {
    // Local logout should still complete if the session expired server-side.
  }
  removeLocalStorageItem(sessionStorageKey);
  state.account = accountFromUser(null);
  state.downloads = [];
  state.downloadQuota = null;
  state.licenseCodes = [];
  state.staticLicenseCodes = [];
  persistActiveAccount();
  els.plansPanel.hidden = true;
  els.accountPanel.hidden = true;
  els.accountPassword.value = "";
  els.accountPasswordConfirm.value = "";
  if (els.accountRegistrationCode) els.accountRegistrationCode.value = "";
  els.accountFirstName.value = "";
  els.accountLastName.value = "";
  goHome();
  updateAccountUi();
  log("Signed out.");
}

async function cancelSubscription() {
  if (state.account.subscriptionMode !== "subscription") return;
  try {
    const payload = await apiRequest("/api/subscription/cancel", { method: "POST" });
    state.account = accountFromUser(payload.user);
    persistActiveAccount();
    updateAccountUi();
    log(payload.message || "Subscription cancellation scheduled.");
  } catch (error) {
    log(error.message || "Could not cancel subscription.");
  }
}

function accountProfile(email) {
  return accountProfiles()[String(email || "").toLowerCase()] || null;
}

function accountProfiles() {
  try {
    const parsed = JSON.parse(getLocalStorageItem(accountProfilesStorageKey, "{}") || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function upsertAccountProfile(account) {
  const email = String(account.email || "").toLowerCase();
  const profiles = accountProfiles();
  const existing = profiles[email] || {};
  const profile = {
    email,
    firstName: String(account.firstName || existing.firstName || ""),
    lastName: String(account.lastName || existing.lastName || ""),
    role: isAdminEmail(email) ? "developer" : (account.role === "developer" ? "developer" : "customer"),
    plan: isAdminEmail(email) ? "studio" : (validAccountPlan(account.plan) ? account.plan : "free"),
    subscriptionMode: account.subscriptionMode || existing.subscriptionMode || "free",
    subscriptionStatus: account.subscriptionStatus || existing.subscriptionStatus || "none",
    planEndsAt: account.planEndsAt || existing.planEndsAt || null,
    measurements: sanitizeMeasurements(account.measurements || existing.measurements || {}),
    createdAt: existing.createdAt || Date.now(),
    updatedAt: Date.now()
  };
  profiles[email] = profile;
  setLocalStorageItem(accountProfilesStorageKey, JSON.stringify(profiles));
  return {
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    role: profile.role,
    plan: profile.plan,
    subscriptionMode: profile.subscriptionMode,
    subscriptionStatus: profile.subscriptionStatus,
    planEndsAt: profile.planEndsAt,
    measurements: sanitizeMeasurements(profile.measurements || {})
  };
}

function persistActiveAccount(options = {}) {
  setLocalStorageItem(accountStorageKey, JSON.stringify(state.account));
  if (state.account.email && !options.skipProfile) upsertAccountProfile(state.account);
}

function renderGallery() {
  if (!els.sunGalleryGrid) return;
  els.sunGalleryGrid.classList.remove("gallery-grid-loading");
  els.sunGalleryGrid.removeAttribute("aria-busy");
  els.sunGalleryGrid.removeAttribute("aria-label");
  els.sunGalleryGrid.innerHTML = "";
  if (els.opticalGalleryGrid) els.opticalGalleryGrid.innerHTML = "";
  galleryModels().forEach((model, index) => {
    const card = document.createElement("article");
    card.className = `gallery-card${model.id === state.activeModelId ? " active" : ""}${model.id === state.recentSavedCollectionId ? " just-saved" : ""}`;
    card.dataset.modelId = model.id;
    const thumb = model.thumbnail
      ? `<img src="${model.thumbnail}" alt="Miniatura modelu ${escapeHtml(model.name)}" />`
      : `<span class="gallery-placeholder gallery-placeholder-${(index % 5) + 1}" aria-hidden="true"></span>`;
    const meta = model.description.trim();
    card.innerHTML = `
      <div class="gallery-thumb">${thumb}</div>
      <div class="gallery-body">
        <div class="gallery-title-row">
          <div>
            <h3>${escapeHtml(model.name)}</h3>
            ${meta ? `<div class="gallery-meta">${escapeHtml(meta)}</div>` : ""}
          </div>
        </div>
        <div class="gallery-actions">
          <button type="button" class="accent" data-action="open">${t("open")}</button>
          ${isDeveloper() ? `<button type="button" data-action="edit">Edit</button>` : ""}
          ${isDeveloper() ? `<button type="button" class="compact order-button" data-action="move-left">${t("moveLeft")}</button>` : ""}
          ${isDeveloper() ? `<button type="button" class="compact order-button" data-action="move-right">${t("moveRight")}</button>` : ""}
          ${isDeveloper() && model.id !== defaultModelId ? `<button type="button" class="delete-button" data-action="delete">${t("delete")}</button>` : ""}
        </div>
      </div>
    `;
    els.sunGalleryGrid.append(card);
  });
  renderDeveloperCollectionList();
  renderHeroEditorTargetOptions();
}

function heroEditorModel() {
  const models = galleryModels();
  return models.find((model) => model.id === state.brandSettings.heroModelId) || models[0] || state.models[0] || null;
}

function renderHeroEditorTargetOptions() {
  if (!els.heroEditorTarget) return;
  const models = galleryModels();
  const selected = heroEditorModel();
  els.heroEditorTarget.innerHTML = models.length
    ? models.map((model) => `<option value="${escapeHtml(model.id)}">${escapeHtml(model.name)}</option>`).join("")
    : `<option value="">No available collections</option>`;
  els.heroEditorTarget.disabled = models.length === 0;
  els.heroEditorTarget.value = selected?.id || "";
}

function openHeroEditorTarget() {
  if (!canOpenCreator("Activate a Creator plan to open collections and export production files.")) return;
  const model = heroEditorModel();
  if (model) openCollectionForConfiguration(model);
}

function repairDeletedHeroEditorTarget(deletedModelId) {
  if (state.brandSettings.heroModelId !== deletedModelId) return;
  state.brandSettings.heroModelId = heroEditorModel()?.id || "";
  applyBrandSettings();
  saveBrandSettings();
}

function renderDeveloperCollectionList() {
  if (!els.developerCollectionList) return;
  if (!isDeveloper()) {
    els.developerCollectionList.innerHTML = "";
    return;
  }
  els.developerCollectionList.innerHTML = galleryModels().map((model) => {
    const components = normalizeModelComponents(model.components) || { front: [], temples: [], leftTemples: [], rightTemples: [], lenses: [] };
    const active = state.editingModelId === model.id;
    const thumbnail = model.thumbnail || makeAutoCollectionThumbnail(model.name, model.params || defaultParams, model.category);
    const summary = model.design ? "Creator · parametric OpenSCAD" : [
      `${components.front.length} front`,
      `${components.leftTemples.length} left temple`,
      `${components.rightTemples.length} right temple`,
      `${components.lenses.length} lens`
    ].join(" · ");
    return `
      <article class="developer-collection-row${active ? " active" : ""}" data-model-id="${escapeHtml(model.id)}">
        <img class="developer-collection-thumb" src="${escapeAttr(thumbnail)}" alt="${escapeAttr(model.name)} thumbnail" loading="lazy" />
        <div class="developer-collection-copy">
          <strong>${escapeHtml(model.name)}</strong>
          <small>${escapeHtml(model.category === "optical" ? t("opticalHeading") : t("sunHeading"))} · ${escapeHtml(summary)}</small>
        </div>
        <div class="developer-collection-actions">
          <button type="button" class="compact${active ? " accent" : ""}" data-dev-action="edit">Edit</button>
          <button type="button" class="compact" data-dev-action="photo">Add photo</button>
          <button type="button" class="compact order-button" data-dev-action="move-left">${t("moveLeft")}</button>
          <button type="button" class="compact order-button" data-dev-action="move-right">${t("moveRight")}</button>
          ${model.id !== defaultModelId ? `<button type="button" class="compact delete-button" data-dev-action="delete">${t("delete")}</button>` : ""}
        </div>
      </article>
    `;
  }).join("");
}

function galleryModels() {
  return state.models.filter((model) => model.category === "sun").sort((a, b) => {
    const categoryOrder = categoryRank(a.category) - categoryRank(b.category);
    if (categoryOrder) return categoryOrder;
    const order = Number(a.order || 0) - Number(b.order || 0);
    if (order) return order;
    return Number(a.createdAt || 0) - Number(b.createdAt || 0);
  });
}

async function handleGalleryClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const card = button.closest(".gallery-card");
  const model = state.models.find((item) => item.id === card?.dataset.modelId);
  if (!model) return;
  if (button.dataset.action === "open") {
    if (!canOpenCreator("Activate a Creator plan to open collections and export production files.")) {
      scrollHomeSection("#plansPublicPanel");
      return;
    }
    await openCollectionForConfiguration(model);
    return;
  }
  if (button.dataset.action === "export") {
    if (!canAccessModel(model)) {
      openPlansPanel("Activate a Creator plan to export collection files.");
      log(`${model.name}: ${t("lockedModel")}.`);
      return;
    }
    downloadText(`${slugify(model.name)}.scad`, model.scadSource, "application/scad");
    log(`Exported ${model.name}.scad.`);
    return;
  }
  if (button.dataset.action === "edit") {
    if (!isDeveloper()) {
      log("Editing is available only in developer mode.");
      return;
    }
    startModelEdit(model);
    return;
  }
  if (button.dataset.action === "move-left" || button.dataset.action === "move-right") {
    if (!isDeveloper()) {
      log("Ordering is available only in developer mode.");
      return;
    }
    moveModelInGallery(model.id, button.dataset.action === "move-left" ? -1 : 1);
    return;
  }
  if (button.dataset.action === "delete") {
    if (!isDeveloper()) {
      log("Deletion is available only in developer mode.");
      return;
    }
    await deleteCollectionModel(model);
  }
}

async function openCollectionForConfiguration(model) {
  if (!model) return;
  if (model.design) {
    loadPublishedDesignIntoLab(model);
    return;
  }
  selectModel(model.id);
  navigateToView("configurator");
  await runOptionalBootStep("selected collection component previews", () => hydrateModelComponentMeshes(model));
  rebuildComponentLibrary();
  repairAssemblyForActiveModel(model);
  applyAssemblyToParams();
  buildBuilderControls();
  buildControls();
  updateGeneratedSource();
  if (renderer && scene && camera && modelGroup) render();
}

async function handleDeveloperCollectionListClick(event) {
  const button = event.target.closest("button[data-dev-action]");
  if (!button || !isDeveloper()) return;
  const row = button.closest("[data-model-id]");
  const model = state.models.find((item) => item.id === row?.dataset.modelId);
  if (!model) return;
  if (button.dataset.devAction === "edit") {
    startModelEdit(model);
    return;
  }
  if (button.dataset.devAction === "photo") {
    startDeveloperCollectionPhoto(model);
    return;
  }
  if (button.dataset.devAction === "move-left" || button.dataset.devAction === "move-right") {
    moveModelInGallery(model.id, button.dataset.devAction === "move-left" ? -1 : 1);
    return;
  }
  if (button.dataset.devAction === "delete") {
    await deleteCollectionModel(model);
  }
}

async function deleteCollectionModel(model) {
  if (!model || model.id === defaultModelId) return;
  const previousModels = state.models.map((item) => structuredClone(item));
  const previousActiveId = state.activeModelId;
  const previousEditingModelId = state.editingModelId;
  const nextActiveId = state.models.find((item) => item.id !== model.id)?.id || defaultModelId;
  state.models = state.models.filter((item) => item.id !== model.id);
  if (state.editingModelId === model.id) clearCollectionForm();
  if (state.activeModelId === model.id) selectModel(nextActiveId, { logSelection: false });
  normalizeGalleryOrder(model.category);
  persistModels({ syncBackend: false });
  repairDeletedHeroEditorTarget(model.id);
  renderGallery();
  renderDeveloperCollectionList();
  try {
    const synced = await syncCollectionsToBackend({ announce: true });
    if (!synced) throw new Error("Developer session is required to delete collection from backend.");
    log(`Deleted collection: ${model.name}.`);
  } catch (error) {
    state.models = previousModels;
    state.editingModelId = previousEditingModelId;
    persistModels({ syncBackend: false });
    if (previousActiveId) selectModel(previousActiveId, { logSelection: false });
    renderGallery();
    renderDeveloperCollectionList();
    log(error.message || `Could not delete ${model.name} from backend.`);
  }
}

function moveModelInGallery(modelId, direction) {
  const model = state.models.find((item) => item.id === modelId);
  if (!model) return;
  const siblings = state.models
    .filter((item) => item.category === model.category)
    .sort((a, b) => {
      const order = Number(a.order || 0) - Number(b.order || 0);
      if (order) return order;
      return Number(a.createdAt || 0) - Number(b.createdAt || 0);
    });
  const index = siblings.findIndex((item) => item.id === modelId);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= siblings.length) return;
  const target = siblings[targetIndex];
  const currentOrder = Number(model.order || index);
  model.order = Number(target.order || targetIndex);
  target.order = currentOrder;
  normalizeGalleryOrder(model.category);
  persistModels();
  renderGallery();
  log(`Moved ${model.name} ${direction < 0 ? "left" : "right"} in the gallery.`);
}

function normalizeGalleryOrder(category) {
  state.models
    .filter((item) => item.category === category)
    .sort((a, b) => {
      const order = Number(a.order || 0) - Number(b.order || 0);
      if (order) return order;
      return Number(a.createdAt || 0) - Number(b.createdAt || 0);
    })
    .forEach((model, index) => {
      model.order = index;
      model.updatedAt = Date.now();
    });
}

function queueThumbnailCapture() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try {
        renderer.render(scene, camera);
        syncActiveModel({ thumbnail: els.canvas.toDataURL("image/png") });
      } catch {
        syncActiveModel();
      }
    });
  });
}

async function handleScadImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const source = await file.text();
  const parsed = parseScadParameters(source);
  const model = {
    id: crypto.randomUUID(),
    name: file.name.replace(/\.[^.]+$/, ""),
    scadSource: source,
    params: { ...structuredClone(defaultParams), ...parsed },
    thumbnail: "",
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  state.models.unshift(model);
  persistModels();
  selectModel(model.id);
  navigateToView("configurator");
  log(`Added ${file.name}. Detected ${Object.keys(parsed).length} Frame Lab-compatible parameters.`);
  event.target.value = "";
}

async function addCollectionFromStudio() {
  if (els.addCollection?.disabled) return;
  const wasEditing = Boolean(state.editingModelId);
  setCollectionEditorButtonState("saving", wasEditing);
  try {
    const scadFile = els.galleryScadInput.files?.[0];
    const imageFile = els.collectionImageInput.files?.[0];
    const frontFiles = [...(els.collectionFrontInput.files || [])];
    const leftTempleFiles = [...(els.collectionLeftTempleInput.files || [])];
    const rightTempleFiles = [...(els.collectionRightTempleInput.files || [])];
    const lensFiles = [...(els.collectionLensInput.files || [])];
    const existing = state.editingModelId ? state.models.find((model) => model.id === state.editingModelId) : null;
    const modelId = existing?.id || crypto.randomUUID();
    const title = (els.collectionTitle.value.trim() || scadFile?.name?.replace(/\.[^.]+$/, "") || existing?.name || "New collection");
    const source = scadFile ? await scadFile.text() : sampleScad;
    const parsed = scadFile ? parseScadParameters(source) : {};
    const params = existing && !scadFile ? existing.params : { ...structuredClone(defaultParams), ...parsed };
    const thumbnail = imageFile
      ? state.croppedCollectionImage || await readFileAsDataUrl(imageFile)
      : existing?.thumbnail || makeAutoCollectionThumbnail(title, params, els.collectionCategory.value);
    const thumbnailSource = imageFile ? "custom" : existing?.thumbnailSource || (existing?.thumbnail ? "custom" : "");
    const frontComponents = [];
    for (const [index, file] of frontFiles.entries()) {
      frontComponents.push(await createComponentRecordFromFile(file, "front", {
        collectionId: modelId,
        name: `${title} Front ${index + 1}`
      }));
    }
    const leftTempleComponents = [];
    for (const [index, file] of leftTempleFiles.entries()) {
      leftTempleComponents.push(await createComponentRecordFromFile(file, "temple", {
        collectionId: modelId,
        name: `${title} Left Temple ${index + 1}`,
        templeSide: "left"
      }));
    }
    const rightTempleComponents = [];
    for (const [index, file] of rightTempleFiles.entries()) {
      rightTempleComponents.push(await createComponentRecordFromFile(file, "temple", {
        collectionId: modelId,
        name: `${title} Right Temple ${index + 1}`,
        templeSide: "right"
      }));
    }
    const lensComponents = [];
    for (const [index, file] of lensFiles.entries()) {
      lensComponents.push(await createComponentRecordFromFile(file, "lens", {
        collectionId: modelId,
        name: `${title} Lens ${index + 1}`
      }));
    }
    if (frontComponents.length || leftTempleComponents.length || rightTempleComponents.length || lensComponents.length) {
      state.uploadedComponents = [...await loadSeedComponentAssets(), ...await loadComponentRecords()]
        .filter((component) => !state.hiddenComponentIds.has(component.id));
      await hydrateUploadedComponentMeshes();
    }
    const existingComponents = normalizeModelComponents(existing?.components) || { front: [], temples: [], leftTemples: [], rightTemples: [], lenses: [] };
    const assembly = existing?.assembly ? structuredClone(existing.assembly) : serializeAssemblySelection();
    if (!existing && frontComponents[0]) assembly.front = { modelId: frontComponents[0].id, size: frontComponents[0].size };
    if (!existing && leftTempleComponents[0]) assembly.leftTemple = { modelId: leftTempleComponents[0].id, size: leftTempleComponents[0].size };
    if (!existing && rightTempleComponents[0]) assembly.rightTemple = { modelId: rightTempleComponents[0].id, size: rightTempleComponents[0].size };
    if (!existing && lensComponents[0]) assembly.lens = { modelId: lensComponents[0].id, size: lensComponents[0].size };
    const initialComponent = frontComponents[0] || leftTempleComponents[0] || rightTempleComponents[0] || lensComponents[0];
    if (!existing && initialComponent) assembly.size = initialComponent.size;
    const category = els.collectionCategory.value === "optical" ? "optical" : "sun";
    const nextOrder = Math.max(-1, ...state.models.filter((item) => item.category === category).map((item) => Number(item.order || 0))) + 1;
    const model = normalizeStoredModel({
      id: modelId,
      name: title,
      category,
      access: "basic",
      description: els.collectionDescription.value.trim(),
      scadSource: scadFile ? source : existing?.scadSource || source,
      params,
      design: existing?.design || null,
      thumbnail,
      thumbnailSource,
      components: {
        front: frontComponents.length ? mergeComponentSummaries(existingComponents.front, frontComponents) : existingComponents.front,
        temples: existingComponents.temples,
        leftTemples: leftTempleComponents.length ? mergeComponentSummaries(existingComponents.leftTemples, leftTempleComponents) : existingComponents.leftTemples,
        rightTemples: rightTempleComponents.length ? mergeComponentSummaries(existingComponents.rightTemples, rightTempleComponents) : existingComponents.rightTemples,
        lenses: lensComponents.length ? mergeComponentSummaries(existingComponents.lenses, lensComponents) : existingComponents.lenses
      },
      assembly,
      order: existing && existing.category === category ? existing.order : nextOrder,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now()
    });
    if (existing) {
      state.models = state.models.map((item) => item.id === existing.id ? model : item);
    } else {
      state.models.unshift(model);
    }
    if (existing && existing.category !== category) normalizeGalleryOrder(existing.category);
    normalizeGalleryOrder(category);
    persistModels({ syncBackend: false });
    await syncCollectionsToBackend({ announce: true });
    state.editingModelId = model.id;
    selectModel(model.id, { logSelection: false, captureThumbnail: !thumbnail });
    renderGallery();
    clearCollectionUploadInputs();
    state.cropImage = null;
    state.croppedCollectionImage = "";
    state.collectionPhotoTargetId = "";
    syncStudioModeUi();
    navigateToView("collection-editor");
    log(`${existing ? "Updated" : "Added"} collection: ${model.name}.`);
    state.recentSavedCollectionId = model.id;
    renderGallery();
    setCollectionEditorButtonState("saved", true);
  } catch (error) {
    log(error.message || "Could not save collection.");
    setCollectionEditorButtonState("error", wasEditing);
  }
}

function mergeComponentSummaries(existing = [], added = []) {
  return uniqueComponentsById([...existing, ...added.map(componentSummary).filter(Boolean)]);
}

async function handleCollectionImageSelect() {
  const file = els.collectionImageInput.files?.[0];
  state.collectionPhotoTargetId = "";
  await openCollectionImageCrop(file);
}

async function handleDeveloperCollectionPhotoSelect() {
  const file = els.developerCollectionPhotoInput?.files?.[0];
  if (!state.collectionPhotoTargetId) {
    if (els.developerCollectionPhotoInput) els.developerCollectionPhotoInput.value = "";
    return;
  }
  await openCollectionImageCrop(file);
}

function startDeveloperCollectionPhoto(model) {
  if (!model || !els.developerCollectionPhotoInput) return;
  state.collectionPhotoTargetId = model.id;
  state.cropImage = null;
  state.croppedCollectionImage = "";
  els.developerCollectionPhotoInput.value = "";
  els.developerCollectionPhotoInput.click();
}

async function openCollectionImageCrop(file) {
  state.croppedCollectionImage = "";
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    state.collectionPhotoTargetId = "";
    if (els.collectionImageInput) els.collectionImageInput.value = "";
    if (els.developerCollectionPhotoInput) els.developerCollectionPhotoInput.value = "";
    log("Choose an image file for the collection photo.");
    return;
  }
  const source = await readFileAsDataUrl(file);
  const image = new Image();
  image.addEventListener("load", () => {
    state.cropImage = image;
    els.cropZoom.value = "1";
    els.cropX.value = "0";
    els.cropY.value = "0";
    els.cropPanel.hidden = false;
    drawImageCrop();
  }, { once: true });
  image.src = source;
}

function drawImageCrop() {
  if (!state.cropImage) return;
  const canvas = els.cropCanvas;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const image = state.cropImage;
  const zoom = Number(els.cropZoom.value) || 1;
  const baseScale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const scale = baseScale * zoom;
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const maxX = Math.max(0, (drawWidth - width) / 2);
  const maxY = Math.max(0, (drawHeight - height) / 2);
  const offsetX = (Number(els.cropX.value) / 100) * maxX;
  const offsetY = (Number(els.cropY.value) / 100) * maxY;
  const x = (width - drawWidth) / 2 + offsetX;
  const y = (height - drawHeight) / 2 + offsetY;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#090b0b";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, x, y, drawWidth, drawHeight);
  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);
}

async function applyImageCrop() {
  if (!state.cropImage) return;
  drawImageCrop();
  state.croppedCollectionImage = els.cropCanvas.toDataURL("image/jpeg", 0.92);
  els.cropPanel.hidden = true;
  els.cropNote.textContent = "Cropped image ready.";
  if (state.collectionPhotoTargetId) {
    await saveDeveloperCollectionPhoto(state.collectionPhotoTargetId, state.croppedCollectionImage);
    state.collectionPhotoTargetId = "";
    state.cropImage = null;
    state.croppedCollectionImage = "";
    if (els.developerCollectionPhotoInput) els.developerCollectionPhotoInput.value = "";
    if (els.collectionImageInput) els.collectionImageInput.value = "";
    return;
  }
  renderFrameEditorAssets();
  log("Cropped gallery image ready.");
}

async function saveDeveloperCollectionPhoto(modelId, thumbnail) {
  const model = state.models.find((item) => item.id === modelId);
  if (!model || !thumbnail) return;
  const updated = normalizeStoredModel({ ...model, thumbnail, thumbnailSource: "custom", updatedAt: Date.now() });
  state.models = state.models.map((item) => item.id === model.id ? updated : item);
  persistModels({ syncBackend: false });
  renderGallery();
  renderDeveloperCollectionList();
  if (state.editingModelId === model.id) renderFrameEditorAssets();
  try {
    await syncCollectionsToBackend({ announce: true });
    log(`Updated photo for ${model.name}.`);
  } catch (error) {
    log(error.message || "Photo updated locally, but backend sync failed.");
  }
}

function cancelImageCrop() {
  state.cropImage = null;
  state.croppedCollectionImage = "";
  state.collectionPhotoTargetId = "";
  els.collectionImageInput.value = "";
  if (els.developerCollectionPhotoInput) els.developerCollectionPhotoInput.value = "";
  els.cropPanel.hidden = true;
  renderFrameEditorAssets();
}

function handleComponentFileSelect() {
  const file = els.componentFileInput.files?.[0];
  if (!file) return;
  const cleanName = file.name.replace(/\.[^.]+$/, "");
  if (!els.componentName.value.trim()) els.componentName.value = cleanName.replace(/\bearing\b/gi, "temple");
  if (/lens|lense|szk[lł]o|szk[lł]a|soczew/i.test(file.name)) {
    els.componentKind.value = "lens";
  } else if (/temple|tample|earing|zausz/i.test(file.name)) {
    els.componentKind.value = "temple";
  } else if (/front|frame|ramka/i.test(file.name)) {
    els.componentKind.value = "front";
  }
  if (els.componentKind.value === "temple") {
    els.componentTempleSide.value = inferTempleSide(file.name);
  }
  syncComponentSideInput();
}

function syncComponentSideInput() {
  if (!els.componentTempleSide) return;
  const isTemple = els.componentKind.value === "temple";
  els.componentTempleSide.disabled = !isTemple;
  els.componentTempleSide.classList.toggle("muted-control", !isTemple);
  if (!isTemple) els.componentTempleSide.value = "universal";
}

function startModelEdit(model) {
  selectModel(model.id, { logSelection: false, captureThumbnail: false });
  state.editingModelId = model.id;
  state.cropImage = null;
  state.croppedCollectionImage = "";
  state.collectionPhotoTargetId = "";
  els.collectionTitle.value = model.name;
  els.collectionCategory.value = model.category === "optical" ? "optical" : "sun";
  els.collectionAccess.value = "basic";
  els.collectionDescription.value = model.description || "";
  els.galleryScadInput.value = "";
  els.collectionImageInput.value = "";
  els.collectionFrontInput.value = "";
  els.collectionLeftTempleInput.value = "";
  els.collectionRightTempleInput.value = "";
  els.collectionLensInput.value = "";
  setCollectionEditorButtonState("idle", true);
  syncStudioModeUi();
  navigateToView("collection-editor");
  log(`Editing collection: ${model.name}.`);
}

function syncStudioModeUi() {
  if (!els.studioModeLabel || !els.clearStudioEdit) return;
  const model = state.editingModelId ? state.models.find((item) => item.id === state.editingModelId) : null;
  els.studioModeLabel.textContent = model ? `${t("editingCollection")}: ${model.name}` : t("newCollection");
  if (els.collectionEditorHeading) els.collectionEditorHeading.textContent = model ? model.name : t("frameEditorHeading");
  els.clearStudioEdit.hidden = !model;
  renderDeveloperCollectionList();
  renderComponentFileList();
  renderFrameEditorAssets();
}

function makeAutoCollectionThumbnail(title, params, category) {
  const accent = category === "optical" ? mixHex(state.brandSettings.accentColor, "#ffffff", 0.22) : state.brandSettings.accentColor;
  const frame = category === "optical" ? "#2c2925" : "#171512";
  const lensW = THREE.MathUtils.clamp(params.lens_width * 1.65, 74, 104);
  const lensH = THREE.MathUtils.clamp(params.lens_height * 1.55, 48, 70);
  const bridge = THREE.MathUtils.clamp(params.bridge_width * 1.2, 16, 30);
  const x1 = 96 - bridge / 2 - lensW;
  const x2 = 96 + bridge / 2;
  const y = 72 - lensH / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 192 126">
    <rect width="192" height="126" fill="#fff8f1"/>
    <rect x="${x1}" y="${y}" width="${lensW}" height="${lensH}" rx="14" fill="none" stroke="${frame}" stroke-width="8"/>
    <rect x="${x2}" y="${y}" width="${lensW}" height="${lensH}" rx="14" fill="none" stroke="${frame}" stroke-width="8"/>
    <path d="M${x1 + lensW} 70 C${90} 62 ${102} 62 ${x2} 70" fill="none" stroke="${frame}" stroke-width="7" stroke-linecap="round"/>
    <path d="M${x1 - 2} ${y + 8} L20 28" fill="none" stroke="${frame}" stroke-width="7" stroke-linecap="round"/>
    <path d="M${x2 + lensW + 2} ${y + 8} L172 28" fill="none" stroke="${frame}" stroke-width="7" stroke-linecap="round"/>
    <circle cx="154" cy="95" r="4" fill="${accent}"/>
    <text x="24" y="110" fill="#766b63" font-size="8" font-family="Inter,Arial" font-weight="700">${escapeHtml(title).slice(0, 26)}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function centerObjectForViewerPivot(object) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;
  const center = box.getCenter(new THREE.Vector3()).sub(object.position);
  object.children.forEach((child) => {
    child.position.sub(center);
  });
}

function normalizeObjectForScene(object) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;
  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);
}

async function createComponentRecordFromFile(file, kind, options = {}) {
  const formatRaw = file.name.split(".").pop().toLowerCase();
  if (!["3mf", "step", "stp"].includes(formatRaw)) {
    throw new Error(`Unsupported component file: ${file.name}`);
  }
  const format = formatRaw === "stp" ? "step" : formatRaw;
  const cleanName = file.name.replace(/\.[^.]+$/, "");
  const component = {
    id: crypto.randomUUID(),
    name: (options.name || cleanName).trim(),
    kind: ["front", "temple", "lens"].includes(kind) ? kind : "front",
    templeSide: kind === "temple" ? normalizeTempleSide(options.templeSide || inferTempleSide(file.name)) : "",
    size: ["S", "M", "L"].includes(options.size) ? options.size : "M",
    connector: String(options.connector || "FL-H8").trim() || "FL-H8",
    format,
    fileName: file.name,
    byteSize: file.size,
    collectionId: options.collectionId || "",
    source: "uploaded",
    analysis: await analyzeComponentFile(file, format),
    createdAt: Date.now()
  };
  component.materialColor = component.analysis?.materialColor || null;
  await saveComponentRecord(component, file);
  return component;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function clearCollectionForm() {
  state.editingModelId = null;
  state.cropImage = null;
  state.croppedCollectionImage = "";
  state.collectionPhotoTargetId = "";
  els.collectionTitle.value = "";
  els.collectionDescription.value = "";
  els.collectionCategory.value = "sun";
  els.collectionAccess.value = "basic";
  clearCollectionUploadInputs();
  setCollectionEditorButtonState("idle", false);
  syncStudioModeUi();
}

function clearCollectionUploadInputs() {
  els.galleryScadInput.value = "";
  els.collectionImageInput.value = "";
  els.collectionFrontInput.value = "";
  els.collectionLeftTempleInput.value = "";
  els.collectionRightTempleInput.value = "";
  els.collectionLensInput.value = "";
}

function attachComponentToCurrentModel(component) {
  const model = activeEditableModelRecord();
  const summary = componentSummary(component);
  if (!model || !summary) return;
  const components = normalizeModelComponents(model.components) || { front: [], temples: [], leftTemples: [], rightTemples: [], lenses: [] };
  if (component.kind === "front") {
    components.front = uniqueComponentsById([...components.front, summary]);
  } else if (component.kind === "lens") {
    components.lenses = uniqueComponentsById([...components.lenses, summary]);
  } else {
    const side = normalizeTempleSide(component.templeSide);
    if (side === "left") {
      components.leftTemples = uniqueComponentsById([...components.leftTemples, summary]);
    } else if (side === "right") {
      components.rightTemples = uniqueComponentsById([...components.rightTemples, summary]);
    } else {
      components.temples = uniqueComponentsById([...components.temples, summary]);
    }
  }
  model.components = components;
  model.assembly = serializeAssemblySelection();
  model.updatedAt = Date.now();
}

async function addComponentFile() {
  if (!state.editingModelId) {
    log("Save this collection first, then add individual component options.");
    return;
  }
  const file = els.componentFileInput.files?.[0];
  if (!file) {
    log("Choose a 3MF, STEP, or STP file.");
    return;
  }
  const format = file.name.split(".").pop().toLowerCase();
  if (!["3mf", "step", "stp"].includes(format)) {
    log("Supported files are .3mf, .step, and .stp.");
    return;
  }
  const component = await createComponentRecordFromFile(file, els.componentKind.value, {
    collectionId: state.editingModelId || state.activeModelId,
    name: els.componentName.value.trim() || file.name.replace(/\.[^.]+$/, ""),
    size: els.componentSize.value,
    connector: els.componentConnector.value.trim() || "FL-H8",
    templeSide: els.componentTempleSide.value
  });
  state.uploadedComponents = [...await loadSeedComponentAssets(), ...await loadComponentRecords()]
    .filter((item) => !state.hiddenComponentIds.has(item.id));
  await hydrateUploadedComponentMeshes();
  attachComponentToCurrentModel(component);
  rebuildComponentLibrary();
  selectFirstAssemblyVariants();
  applyAssemblyToParams();
  buildBuilderControls();
  buildControls();
  updateGeneratedSource();
  render();
  renderGallery();
  syncActiveModel();
  syncStudioModeUi();
  els.componentFileInput.value = "";
  els.componentName.value = "";
  log(`Added component: ${component.name} (${component.format.toUpperCase()}, ${component.size}, ${component.connector}).`);
}

async function analyzeComponentFile(file, format) {
  if (format === "3mf") {
    try {
      const parsed = await parse3mfComponent(file);
      return parsed.analysis;
    } catch (error) {
      return { readable: false, summary: `3MF saved, preview unavailable: ${error.message}` };
    }
  }
  const header = await file.slice(0, 240).text();
  return {
    readable: /^ISO-10303-21/i.test(header.trim()),
    summary: /^ISO-10303-21/i.test(header.trim()) ? "STEP AP file" : "STEP saved without CAD-kernel validation"
  };
}

async function hydrateUploadedComponentMeshes() {
  await Promise.all(state.uploadedComponents.map(async (component) => {
    if (component.meshObject) return;
    if (component.format !== "3mf" || !component.fileBlob) return;
    try {
      const parsed = await parse3mfComponent(component.fileBlob);
      component.meshObject = parsed.object;
      component.materialColor = parsed.analysis.materialColor;
      component.analysis = { ...(component.analysis || {}), ...parsed.analysis };
    } catch (error) {
      component.analysis = {
        ...(component.analysis || {}),
        readable: false,
        summary: `3MF saved, preview unavailable: ${error.message}`
      };
    }
  }));
}

async function hydrateModelComponentMeshes(model = currentModelRecord()) {
  const neededIds = new Set(modelComponentsInOrder(model).map((component) => component.id));
  if (!neededIds.size) return hydrateUploadedComponentMeshes();
  await Promise.all(state.uploadedComponents.map(async (component) => {
    if (!neededIds.has(component.id) || component.fileBlob || component.source === "asset") return;
    const fullRecord = await getComponentRecord(component.id).catch(() => null);
    if (!fullRecord?.fileBlob) return;
    Object.assign(component, {
      ...fullRecord,
      source: component.source || fullRecord.source || "uploaded",
      meshObject: component.meshObject || fullRecord.meshObject || null
    });
  }));
  await hydrateUploadedComponentMeshes();
}

async function loadSeedComponentAssets() {
  const results = [];
  await Promise.all(seedComponentAssets.map(async (component) => {
    try {
      const response = await fetch(component.assetUrl);
      if (!response.ok) return;
      const blob = await response.blob();
      const parsed = await parse3mfComponent(blob);
      results.push({
        ...component,
        byteSize: blob.size,
        materialColor: parsed.analysis.materialColor,
        analysis: parsed.analysis,
        meshObject: parsed.object,
        createdAt: Date.now()
      });
    } catch {
      // Optional local test assets should never block the app.
    }
  }));
  return results;
}

async function parse3mfComponent(fileOrBlob) {
  const buffer = await fileOrBlob.arrayBuffer();
  const loader = new ThreeMFLoader();
  const object = loader.parse(buffer.slice(0));
  let meshes = 0;
  let triangles = 0;
  object.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    meshes += 1;
    const position = child.geometry.getAttribute("position");
    if (position) triangles += Math.floor(position.count / 3);
  });
  const materialColors = [...new Set([...extract3mfXmlColors(buffer), ...extractObjectMaterialColors(object)])];
  const materialColor = materialColors[0] || null;
  return {
    object,
    analysis: {
      readable: true,
      meshes,
      triangles,
      materialColor,
      materialColors,
      summary: `${meshes} mesh / ${triangles.toLocaleString("en-US")} tris${materialColor ? ` / ${materialColor}` : ""}`
    }
  };
}

function extractObjectMaterialColors(object) {
  const colors = [];
  object.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (material?.color?.isColor) colors.push(`#${material.color.getHexString().toUpperCase()}`);
    });
  });
  return colors;
}

function extract3mfXmlColors(buffer) {
  try {
    const files = unzipSync(new Uint8Array(buffer));
    const modelFile = files["3D/3dmodel.model"];
    if (!modelFile) return [];
    const xml = strFromU8(modelFile);
    return [...xml.matchAll(/<m:color\b[^>]*\bcolor="(#[0-9a-fA-F]{6})(?:[0-9a-fA-F]{2})?"/g)].map((match) => match[1].toUpperCase());
  } catch {
    return [];
  }
}

function parseScadParameters(source) {
  const params = {};
  parameterSchema.forEach(([key, , , min, max]) => {
    const pattern = new RegExp(`(^|\\n)\\s*${escapeRegExp(key)}\\s*=\\s*([-+]?\\d*\\.?\\d+)\\s*;`);
    const match = source.match(pattern);
    if (match) params[key] = THREE.MathUtils.clamp(Number(match[2]), min, max);
  });
  return params;
}

function updateGeneratedSource() {
  els.scadPreview.textContent = generateScadSource();
  els.modelName.textContent = state.modelName;
}

function generateScadSource() {
  const generated = buildGeneratedScad();
  if (!state.scadSource || state.scadSource === sampleScad) return generated;
  let source = state.scadSource;
  parameterSchema.forEach(([key]) => {
    const assignment = `${key} = ${formatNumber(state.params[key])};`;
    const pattern = new RegExp(`(^|\\n)(\\s*)${escapeRegExp(key)}\\s*=\\s*[-+]?\\d*\\.?\\d+\\s*;`);
    if (pattern.test(source)) {
      source = source.replace(pattern, `$1$2${assignment}`);
    } else {
      source = `${assignment}\n${source}`;
    }
  });
  return source;
}

function buildGeneratedScad() {
  const paramLines = parameterSchema
    .map(([key, label, , min, max, step]) => `${key} = ${formatNumber(state.params[key])}; // [${min}:${step}:${max}] ${label}`)
    .join("\n");
  return `${paramLines}

module rounded_square_2d(size=[10,10], r=2) {
  offset(r=r) square([size[0]-2*r, size[1]-2*r], center=true);
}

module lens_rim(cx=0) {
  translate([cx, 0, 0])
  linear_extrude(height=frame_depth, center=true, convexity=8)
  difference() {
    rounded_square_2d([lens_width + rim_thickness*2.15, lens_height + rim_thickness*2.05], corner_radius + rim_thickness*0.9);
    rounded_square_2d([lens_width, lens_height], corner_radius);
  }
}

module soft_bar(size=[10,4,4], r=1) {
  linear_extrude(height=size[2], center=true, convexity=4)
  rounded_square_2d([size[0], size[1]], r);
}

module brow_bar() {
  total_width = bridge_width + lens_width*2 + rim_thickness*5.3;
  translate([0, lens_height/2 + rim_thickness*0.72, 0.05])
  soft_bar([total_width, rim_thickness*1.05, frame_depth*0.95], rim_thickness*0.45);
}

module bridge() {
  translate([0, lens_height*0.08, 0])
  soft_bar([bridge_width + rim_thickness*2.35, rim_thickness*1.15, frame_depth], rim_thickness*0.35);
}

module nose_pads() {
  for (side=[-1,1])
  translate([side*(bridge_width/2 + nose_pad_width/2), -lens_height/4 - nose_pad_drop/4, -frame_depth/2])
  rotate([0, 0, side*10])
  soft_bar([nose_pad_width, rim_thickness*1.45, frame_depth*0.72], rim_thickness*0.35);
}

module temple(side=1) {
  lens_center = (bridge_width + lens_width) / 2;
  hinge_x = side * (lens_center + lens_width/2 + rim_thickness + hinge_width/2);
  translate([hinge_x, lens_height*0.28, -frame_depth*0.08])
  rotate([0, side*temple_spread, 0])
  union() {
    soft_bar([hinge_width, rim_thickness*1.7, frame_depth*1.2], rim_thickness*0.32);
    for (slot=[-1,1])
    translate([side*hinge_width*0.52, slot*rim_thickness*0.42, -frame_depth*0.78])
    rotate([0, 90, 0])
    cylinder(h=hinge_width*0.95, r=rim_thickness*0.34, center=true, $fn=20);
    translate([side*hinge_width*0.34, 0.2, -temple_length/2 - frame_depth*0.5])
    soft_bar([rim_thickness*1.25, rim_thickness*1.05, temple_length], rim_thickness*0.32);
    translate([side*hinge_width*0.34, -temple_drop*0.28, -temple_length - frame_depth*0.5 - temple_drop*0.28])
    rotate([-28, 0, 0])
    soft_bar([rim_thickness*1.3, rim_thickness*1.05, temple_drop], rim_thickness*0.32);
  }
}

module glasses() {
  lens_center = (bridge_width + lens_width) / 2;
  union() {
    lens_rim(-lens_center);
    lens_rim(lens_center);
    brow_bar();
    bridge();
    nose_pads();
    temple(-1);
    temple(1);
  }
}

glasses();
`;
}

function sampleDesignProfile(sketch, p) {
  const points = sketch.points.map(([x, y]) => ({ x: x * p.lens_width, y: y * p.lens_height }));
  const corners = roundedPolygonCorners(points, sketch.cornerRadii);
  const path = [];
  const segments = 16;
  corners.forEach((corner, index) => {
    path.push(corner.start);
    for (let step = 1; step <= segments; step += 1) {
      const t = step / segments;
      const inverse = 1 - t;
      path.push({
        x: inverse * inverse * corner.start.x + 2 * inverse * t * corner.point.x + t * t * corner.end.x,
        y: inverse * inverse * corner.start.y + 2 * inverse * t * corner.point.y + t * t * corner.end.y
      });
    }
    path.push(corners[(index + 1) % corners.length].start);
  });
  return path.map((point) => [point.x / p.lens_width, point.y / p.lens_height]);
}

function sampleDesignTempleProfile(sketch) {
  const points = sketch.points.map(([x, y]) => ({ x, y }));
  const corners = roundedPolygonCorners(points, sketch.cornerRadii);
  const path = [];
  const segments = 16;
  corners.forEach((corner, index) => {
    path.push(corner.start);
    for (let step = 1; step <= segments; step += 1) {
      const t = step / segments;
      const inverse = 1 - t;
      path.push([
        inverse * inverse * corner.start.x + 2 * inverse * t * corner.point.x + t * t * corner.end.x,
        inverse * inverse * corner.start.y + 2 * inverse * t * corner.point.y + t * t * corner.end.y
      ]);
    }
    path.push([corners[(index + 1) % corners.length].start.x, corners[(index + 1) % corners.length].start.y]);
  });
  return path.map((point) => Array.isArray(point) ? point : [point.x, point.y]);
}

function buildDesignScad(draft = state.designDraft) {
  const p = designGeometryParams(draft.params);
  const definition = designDefinitionFromDraft(draft);
  const style = normalizeDesignStyle(definition);
  const features = normalizeDesignFeatures(definition.features, p);
  const construction = normalizeDesignConstruction(definition.construction);
  const topVisorControls = designTopVisorControls(p, definition);
  const leftText = style.leftTempleText.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
  const rightText = style.rightTempleText.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
  const sketch = normalizeDesignSketch(definition.sketch);
  const templeSketch = normalizeDesignTempleSketch(definition.templeSketch, construction);
  const profilePoints = sketch.points
    .map(([x, y]) => `[${formatNumber(x)}, ${formatNumber(y)}]`)
    .join(", ");
  const profileCornerRadii = sketch.cornerRadii.map((radius) => formatNumber(radius)).join(", ");
  const profilePath = sampleDesignProfile(sketch, p)
    .map(([x, y]) => `[${formatNumber(x)}, ${formatNumber(y)}]`)
    .join(", ");
  const templeProfilePoints = templeSketch.points
    .map(([x, y]) => `[${formatNumber(x)}, ${formatNumber(y)}]`)
    .join(", ");
  const templeProfileCornerRadii = templeSketch.cornerRadii.map((radius) => formatNumber(radius)).join(", ");
  const templeProfilePath = sampleDesignTempleProfile(templeSketch)
    .map(([x, y]) => `[${formatNumber(x)}, ${formatNumber(y)}]`)
    .join(", ");
  const bridgeProfilePath = designBridgeProfileRing(p, definition)
    .map(([x, y]) => `[${formatNumber(x)}, ${formatNumber(y)}]`)
    .join(", ");
  const bridgeLowerBlendPaths = designBridgeLowerBlendRings(p, definition)
    .map((ring) => `[${ring.map(([x, y]) => `[${formatNumber(x)}, ${formatNumber(y)}]`).join(", ")}]`)
    .join(", ");
  const noseWingPathList = (side) => {
    const paths = designNoseWingFootprintPolygons(p, definition, side)
      .map((polygon) => designCleanRing(polygon?.[0] || []))
      .filter((ring) => ring.length >= 3)
      .map((ring) => `[${ring.map(([x, y]) => `[${formatNumber(x)}, ${formatNumber(y)}]`).join(", ")}]`);
    return `[${paths.join(", ")}]`;
  };
  const hingeConnectorLeftPath = designHingePadConnectorRing(-1, p, definition)
    .map(([x, y]) => `[${formatNumber(x)}, ${formatNumber(y)}]`)
    .join(", ");
  const hingeConnectorRightPath = designHingePadConnectorRing(1, p, definition)
    .map(([x, y]) => `[${formatNumber(x)}, ${formatNumber(y)}]`)
    .join(", ");
  const publicParameters = definition.publicParameters.map((key) => `"${key}"`).join(", ");
  const customerRanges = definition.publicParameters.map((key) => {
    const range = definition.sliderRanges[key];
    return `["${key}", ${formatNumber(range.min)}, ${formatNumber(range.max)}, ${formatNumber(range.step)}]`;
  }).join(", ");
  const paramLines = parameterSchema
    .map(([key, label, , min, max, step]) => `${key} = ${formatNumber(p[key])}; // [${min}:${step}:${max}] ${label}`)
    .join("\n");
  return `// Frame Lab Creator project
// Parametric sunglasses: edit values here or in Creator.

${paramLines}
lens_shape = "${style.lensShape}";
temple_detail_mode = "${style.templeDetailMode}";
temple_pattern = "${style.templePattern}";
left_temple_text = "${leftText}";
right_temple_text = "${rightText}";
brow_bar_enabled = ${style.browBar ? "true" : "false"};
front_color = "${style.frameColor}";
temple_color = "${style.templeColor}";
frame_color = "${style.frameColor}"; // Legacy alias for older Frame Lab exports.
lens_color = "${style.lensColor}";
detail_color = "${style.detailColor}";
profile_points = [${profilePoints}];
profile_corner_radii = [${profileCornerRadii}]; // Radius at each authored drawing point.
profile_path = [${profilePath}]; // Local corner fillets resolved from the drawing.
bridge_profile_path = [${bridgeProfilePath}]; // Nose bridge profile with draggable horizontal lines.
bridge_lower_blend_paths = [${bridgeLowerBlendPaths}]; // Smooth lower bridge-to-rim transition patches.
nose_wing_left_paths = ${noseWingPathList(-1)}; // Rear nose wing footprints resolved from the 2D front profile.
nose_wing_right_paths = ${noseWingPathList(1)};
hinge_connector_left_path = [${hingeConnectorLeftPath}]; // Keeps the left pad bonded to the rim when mount height changes.
hinge_connector_right_path = [${hingeConnectorRightPath}]; // Keeps the right pad bonded to the rim when mount height changes.
temple_profile_points = [${templeProfilePoints}];
temple_profile_corner_radii = [${templeProfileCornerRadii}]; // Radius at each temple vertex.
temple_profile_path = [${templeProfilePath}]; // Closed side profile of the printable temple.
customer_sliders = [${publicParameters}]; // Exposed controls in Frame Lab.
customer_slider_ranges = [${customerRanges}]; // Safe customer adjustment limits.
extrude_enabled = true; // Front depth is always active; kept for legacy exports.
extrude_depth = ${formatNumber(features.extrude.depth)};
fillet_enabled = ${features.fillet.enabled ? "true" : "false"};
fillet_radius = ${formatNumber(features.fillet.radius)};
chamfer_enabled = ${features.chamfer.enabled ? "true" : "false"};
chamfer_amount = ${formatNumber(features.chamfer.amount)};
lens_recess_enabled = ${features.lensRecess.enabled ? "true" : "false"};
lens_thickness = ${formatNumber(construction.lensThickness)};
lens_seat_width = ${formatNumber(construction.lensSeatWidth)};
lens_seat_depth = ${formatNumber(construction.lensSeatDepth)};
lens_clearance = ${formatNumber(construction.lensClearance)};
lens_channel_offset = ${formatNumber(construction.lensChannelOffset)};
hinge_standard = "${construction.hingeStandard}";
hinge_mount_height = ${formatNumber(construction.hingeMountHeight)};
hinge_mount_offset = ${formatNumber(construction.hingeMountOffset)};
bridge_thickness = ${formatNumber(construction.bridgeThickness)};
bridge_blend_radius = ${formatNumber(construction.bridgeBlendRadius)};
bridge_top_join_offset = ${formatNumber(construction.bridgeTopJoinOffset)};
bridge_bottom_join_offset = ${formatNumber(construction.bridgeBottomJoinOffset)};
nose_wing_height = ${formatNumber(construction.noseWingHeight)};
nose_wing_angle = ${formatNumber(construction.noseWingAngle)};
nose_wing_round = ${formatNumber(construction.noseWingRound)};
nose_wing_top_round = ${formatNumber(construction.noseWingTopRound)};
nose_wing_base_round = ${formatNumber(construction.noseWingBaseRound)};
nose_wing_top_offset = ${formatNumber(construction.noseWingTopOffset)};
nose_wing_bottom_offset = ${formatNumber(construction.noseWingBottomOffset)};
nose_wing_top_shift = ${formatNumber(construction.noseWingTopShift)};
nose_wing_bottom_shift = ${formatNumber(construction.noseWingBottomShift)};
nose_wing_top_outer_offset = ${formatNumber(construction.noseWingTopOuterOffset)};
nose_wing_top_inner_offset = ${formatNumber(construction.noseWingTopInnerOffset)};
nose_wing_bottom_inner_offset = ${formatNumber(construction.noseWingBottomInnerOffset)};
nose_wing_bottom_outer_offset = ${formatNumber(construction.noseWingBottomOuterOffset)};
top_visor_enabled = ${construction.topVisorEnabled ? "true" : "false"};
top_visor_depth = ${formatNumber(construction.topVisorDepth)};
top_visor_band_height = ${formatNumber(construction.topVisorBandHeight)};
top_visor_radius = ${formatNumber(construction.topVisorRadius)};
top_visor_start_x = ${formatNumber(topVisorControls.startX)};
top_visor_end_x = ${formatNumber(topVisorControls.endX)};
top_visor_top_y = ${formatNumber(topVisorControls.topY)};
top_visor_bottom_y = top_visor_top_y - top_visor_band_height;
hinge_pad_size = ${formatNumber(designHingePadSize)};
hinge_pad_overlap = ${formatNumber(designHingePadOverlap)};
hinge_rear_overlap = ${formatNumber(designHingeRearOverlap)};
front_depth = extrude_depth;
front_face_z = front_depth / 2;
hinge_rear_z = -front_face_z + hinge_rear_overlap; // Mechanical hinge is bonded behind the planar pad.
nose_wing_rear_overlap = min(min(${formatNumber(designNoseWingRearOverlapMax)}, max(0, nose_wing_height) * 0.72), max(${formatNumber(designNoseWingRearOverlapMin)}, max(0, nose_wing_height) * 0.32));
temple_straight = ${formatNumber(construction.templeStraight)};
temple_hook = ${formatNumber(construction.templeHook)};
temple_hook_angle = ${formatNumber(construction.templeHookAngle)};
temple_bar_height = ${formatNumber(construction.templeBarHeight)};
temple_depth = ${formatNumber(construction.templeDepth)};
temple_corner_radius = ${formatNumber(construction.templeCornerRadius)};
temple_chamfer_enabled = ${construction.templeChamferEnabled ? "true" : "false"};
temple_chamfer_amount = ${formatNumber(construction.templeChamferAmount)};
temple_texture_depth = ${formatNumber(construction.templeTextureDepth)};
temple_pattern_start = ${formatNumber(construction.templePatternStart)};
temple_pattern_end = ${formatNumber(construction.templePatternEnd)};
temple_pattern_spacing = ${formatNumber(construction.templePatternSpacing)};
temple_pattern_size = ${formatNumber(construction.templePatternSize)};
temple_text_size = ${formatNumber(construction.templeTextSize)};
temple_text_position = ${formatNumber(construction.templeTextPosition)};
temple_text_y_offset = ${formatNumber(construction.templeTextYOffset)};
temple_text_depth = ${formatNumber(construction.templeTextDepth)};
temple_bar_center_y = ${formatNumber(designTempleBarCenterY)}; // Center of FL-H1 temple body after rotation.
temple_hinge_rear_z = ${formatNumber(designTempleHingeRearZ)}; // Rear face of FL-H1 temple body after orientation.
temple_arm_join_overlap = ${formatNumber(designTempleArmJoinOverlap)}; // Solid overlap into the supplied hinge body.
temple_arm_start_z = temple_hinge_rear_z + temple_arm_join_overlap;
authored_temple_length = temple_straight + temple_hook;
active_temple_straight = max(35, temple_straight + temple_length - authored_temple_length);
max_lens_channel_offset = max(0, (extrude_depth - lens_seat_width)/2 - 0.45);
active_lens_channel_offset = min(max(lens_channel_offset, -max_lens_channel_offset), max_lens_channel_offset);
lens_insert_delta = max(0, lens_seat_depth - lens_clearance);
visible_lip_depth = lens_recess_enabled ? max(0, (front_depth - lens_seat_width)/2 - abs(active_lens_channel_offset)) : front_depth;
edge_chamfer = chamfer_enabled ? min(chamfer_amount, max(0, visible_lip_depth*0.42 - 0.02), rim_thickness*0.32, lens_seat_depth*0.72, 0.9) : 0;
temple_edge_chamfer = temple_chamfer_enabled ? min(temple_chamfer_amount, max(0, temple_depth/2 - 0.02), max(0, temple_bar_height*0.22), 0.9) : 0;
chamfer_slice = 0.02;

hinge_width_allowance = max(0, (hinge_pad_size - hinge_pad_overlap) * 2);
rim_span = max(bridge_width + rim_thickness*4 + 40, head_width - hinge_width_allowance);
opening_width = max(20, (rim_span - bridge_width)/2 - rim_thickness*2);
outer_lens_width = opening_width + rim_thickness*2;
lens_center = bridge_width / 2 + outer_lens_width / 2;

module rounded_rect(size=[10,10], radius=2) {
  safe_radius = min(max(0, radius), min(size[0], size[1])/2 - 0.01);
  offset(r=safe_radius) square([max(0.02, size[0]-2*safe_radius), max(0.02, size[1]-2*safe_radius)], center=true);
}

module drawn_profile(size=[10,10]) {
  polygon([for (point = profile_path) [point[0] * size[0], point[1] * size[1]]]);
}

module lens_profile(size=[10,10], outer=false) {
  drawn_profile(size);
}

module drawn_temple_profile() {
  polygon(temple_profile_path);
}

module soft_bar(size=[10,4,4], radius=1) {
  linear_extrude(height=size[2], center=true, convexity=5)
  rounded_rect([size[0], size[1]], radius);
}

module rim_profile(cx=0) {
  translate([cx, 0, 0])
  scale([cx < 0 ? -1 : 1, 1, 1])
  difference() {
    offset(delta=rim_thickness) lens_profile([opening_width, lens_height], false);
    lens_profile([opening_width, lens_height], false);
  }
}

module rim(cx=0) {
  linear_extrude(height=front_depth, center=true, convexity=10)
    rim_profile(cx);
}

module lens_insert(cx=0) {
  translate([cx, 0, active_lens_channel_offset])
  scale([cx < 0 ? -1 : 1, 1, 1])
  linear_extrude(height=lens_thickness, center=true, convexity=6)
  offset(delta=lens_insert_delta) lens_profile([opening_width, lens_height], false);
}

module lens_seat_cut(cx=0) {
  translate([cx, 0, active_lens_channel_offset])
  scale([cx < 0 ? -1 : 1, 1, 1])
  linear_extrude(height=lens_seat_width, center=true, convexity=6)
  difference() {
    offset(delta=lens_seat_depth) lens_profile([opening_width, lens_height], false);
    lens_profile([opening_width, lens_height], false);
  }
}

module front_hinge(side=1) {
  hinge_x = side*(rim_span/2 - hinge_pad_overlap + hinge_mount_offset);
  translate([hinge_x, hinge_mount_height, hinge_rear_z])
  rotate([-90, 0, 0])
  if (side < 0)
    import("assets/hinges/front-hinge-right.3mf");
  else
    import("assets/hinges/front-hinge-left.3mf");
}

module hinge_pad(side=1) {
  pad_x = side*(rim_span/2 - hinge_pad_overlap + hinge_mount_offset);
  translate([pad_x + side*hinge_pad_size/2, hinge_mount_height + hinge_pad_size/2, 0])
    soft_bar([hinge_pad_size, hinge_pad_size, front_depth], min(0.55, front_depth*0.18));
}

module bridge_profile() {
  union() {
    polygon(bridge_profile_path);
    for (path = bridge_lower_blend_paths)
      if (len(path) >= 3)
        polygon(path);
  }
}

module hinge_pad_profile(side=1) {
  pad_x = side*(rim_span/2 - hinge_pad_overlap + hinge_mount_offset);
  translate([pad_x + side*hinge_pad_size/2, hinge_mount_height + hinge_pad_size/2])
    rounded_rect([hinge_pad_size, hinge_pad_size], min(0.55, front_depth*0.18));
}

module hinge_connector_profile(side=1) {
  polygon(side < 0 ? hinge_connector_left_path : hinge_connector_right_path);
}

module front_planar_profile() {
  // All front interfaces are joined before extrusion, matching the Creator preview.
  union() {
    rim_profile(-lens_center);
    rim_profile(lens_center);
    bridge_profile();
    hinge_connector_profile(-1);
    hinge_connector_profile(1);
  }
}

module nose_wing_profile(side=1) {
  paths = side < 0 ? nose_wing_left_paths : nose_wing_right_paths;
  for (path = paths)
    if (len(path) >= 3)
      polygon(path);
}

module top_visor_side_profile(side=1) {
  side_start_x = side < 0 ? -top_visor_end_x : top_visor_start_x;
  side_end_x = side < 0 ? -top_visor_start_x : top_visor_end_x;
  shield_width = max(0.1, side_end_x - side_start_x);
  shield_height = max(0.1, top_visor_top_y - top_visor_bottom_y);
  shield_radius = min(max(0, top_visor_radius), shield_width/2 - 0.01, shield_height/2 - 0.01);
  intersection() {
    rim_profile(side*lens_center);
    translate([(side_start_x + side_end_x)/2, (top_visor_top_y + top_visor_bottom_y)/2])
      rounded_rect([shield_width, shield_height], shield_radius);
  }
}

module top_visor_profile() {
  union() {
    top_visor_side_profile(-1);
    top_visor_side_profile(1);
  }
}

module nose_wing(side=1) {
  wing_depth = max(0, nose_wing_height);
  if (wing_depth > 0.01) {
    translate([0, 0, -front_face_z - wing_depth / 2 + nose_wing_rear_overlap])
      linear_extrude(height=wing_depth, convexity=6, center=true)
        nose_wing_profile(side);
  }
}

module nose_wings() {
  nose_wing(-1);
  nose_wing(1);
}

module top_visor() {
  shield_depth = max(0, top_visor_depth);
  if (top_visor_enabled && shield_depth > 0.01) {
    translate([0, 0, -front_face_z - shield_depth / 2 + min(0.08, shield_depth * 0.04)])
      chamfered_profile_extrude(shield_depth, min(top_visor_radius, shield_depth*0.42))
        top_visor_profile();
  }
}

module chamfered_profile_extrude(height=1, chamfer=0) {
  safe_height = max(0.02, height);
  safe_chamfer = min(max(0, chamfer), safe_height/2 - 0.01);
  if (safe_chamfer <= 0.001) {
    linear_extrude(height=safe_height, center=true, convexity=10)
      children();
  } else {
    union() {
      linear_extrude(height=max(0.02, safe_height - safe_chamfer*2), center=true, convexity=10)
        children();
      hull() {
        translate([0, 0, safe_height/2 - safe_chamfer])
          linear_extrude(height=chamfer_slice, center=true, convexity=10)
            children();
        translate([0, 0, safe_height/2])
          linear_extrude(height=chamfer_slice, center=true, convexity=10)
            offset(delta=-safe_chamfer)
              children();
      }
      hull() {
        translate([0, 0, -safe_height/2 + safe_chamfer])
          linear_extrude(height=chamfer_slice, center=true, convexity=10)
            children();
        translate([0, 0, -safe_height/2])
          linear_extrude(height=chamfer_slice, center=true, convexity=10)
            offset(delta=-safe_chamfer)
              children();
      }
    }
  }
}

module front_body() {
  chamfered_profile_extrude(front_depth, edge_chamfer) {
    front_planar_profile();
  }
}

module front() {
  union() {
    difference() {
      union() {
        front_body();
        front_hinge(-1);
        front_hinge(1);
      }
      lens_seat_cut(-lens_center);
      lens_seat_cut(lens_center);
    }
    nose_wings();
    top_visor();
  }
}

module temple_side_relief_mark(side=1, z=20, width=1.4, height=4, angle=0, y_offset=0) {
  safe_width = max(0.2, width);
  safe_height = max(0.2, height);
  safe_radius = max(0.02, min(min(safe_width, safe_height)/2 - 0.01, 0.42));
  translate([
    side*2.5 + side*(temple_depth/2 - temple_texture_depth*0.35),
    temple_bar_center_y + y_offset,
    temple_arm_start_z-z
  ])
  rotate([90, side > 0 ? 90 : -90, 0])
  rotate([0, 0, angle])
  linear_extrude(height=temple_texture_depth, convexity=5)
    rounded_rect([safe_width, safe_height], safe_radius);
}

module temple_pattern_relief(side=1) {
  if (temple_detail_mode == "texture") {
    pattern_start = min(max(0, temple_pattern_start), max(0, active_temple_straight - 4));
    pattern_end = min(max(pattern_start, temple_pattern_end), max(0, active_temple_straight - 4));
    for (z=[pattern_start:temple_pattern_spacing:pattern_end]) {
      index = floor((z - pattern_start) / temple_pattern_spacing);
      segment = temple_pattern_size;
      rib_width = min(1.8, max(0.5, temple_pattern_size * 0.22));
      mark_height = min(temple_bar_height * 0.72, max(0.65, temple_pattern_size * 1.1));
      strip_height = min(1.25, max(0.45, temple_pattern_size * 0.17));
      if (temple_pattern == "ribs")
        temple_side_relief_mark(side, z, rib_width, mark_height, 0);
      if (temple_pattern == "micro-ribs") {
        offset = min(1.25, temple_pattern_size * 0.28);
        temple_side_relief_mark(side, z - offset, rib_width * 0.72, mark_height * 0.82, 0);
        temple_side_relief_mark(side, z + offset, rib_width * 0.72, mark_height * 0.82, 0);
      }
      if (temple_pattern == "slots")
        temple_side_relief_mark(side, z, segment, strip_height, 0);
      if (temple_pattern == "dots") {
        dot = min(temple_bar_height * 0.5, max(0.7, temple_pattern_size * 0.58));
        temple_side_relief_mark(side, z, dot, dot, 0);
      }
      if (temple_pattern == "diamond") {
        temple_side_relief_mark(side, z, segment, strip_height, 45);
        temple_side_relief_mark(side, z, segment, strip_height, -45);
      }
      if (temple_pattern == "wave")
        temple_side_relief_mark(side, z, segment, strip_height, (index % 2 == 0) ? 34 : -34);
    }
  }
}

module temple_mark(side=1) {
  text_value = side < 0 ? right_temple_text : left_temple_text;
  if (temple_detail_mode == "text" && text_value != "")
    translate([side*2.5 + side*(temple_depth/2 - temple_text_depth*0.35), temple_bar_center_y + temple_text_y_offset - temple_text_size/2, temple_arm_start_z-temple_text_position])
    rotate([90, side > 0 ? 90 : -90, 0])
    linear_extrude(height=temple_text_depth)
    text(text_value, size=temple_text_size, halign="center", valign="center");
}

module temple_hinge(side=1) {
  rotate([-90, 0, 0])
  if (side < 0)
    import("assets/hinges/temple-hinge-right.3mf");
  else
    import("assets/hinges/temple-hinge-left.3mf");
}

module temple_profile_body(side=1) {
  translate([side*2.5, temple_bar_center_y, temple_arm_start_z])
  rotate([0, 90, 0])
  chamfered_profile_extrude(temple_depth, temple_edge_chamfer)
    drawn_temple_profile();
}

module temple(side=1) {
  hinge_x = side * (rim_span/2 - hinge_pad_overlap + hinge_mount_offset);
  translate([hinge_x, hinge_mount_height, hinge_rear_z])
  rotate([0, side*temple_spread, 0])
  union() {
    temple_hinge(side);
    temple_profile_body(side);
    color(detail_color) temple_pattern_relief(side);
    color(detail_color) temple_mark(side);
  }
}

module frame() {
  color(front_color) {
    front();
  }
  color(temple_color) {
    temple(-1);
    temple(1);
  }
}

module lenses() {
  color(lens_color) {
    lens_insert(-lens_center);
    lens_insert(lens_center);
  }
}

frame();
lenses();
`;
}

async function generate3mf() {
  const model = currentModelRecord();
  if (!(await ensureDownloadAllowed(model))) return;
  showLoader(true, "Generating 3MF", "Packing the current geometry for production...");
  await waitFrame();
  try {
    const mesh = collectCurrentMesh();
    if (!mesh.triangles.length) throw new Error("brak geometrii do eksportu");
    const blob = make3mfBlob(mesh);
    const fileName = `${slugify(state.modelName)}.3mf`;
    const saved = await recordDownload(fileName, mesh);
    if (!saved) return;
    downloadBlob(fileName, blob);
    const folderNote = " Saved to your production folder.";
    log(`Generated 3MF locally: ${mesh.triangles.length.toLocaleString("en-US")} triangles.${folderNote}`);
  } catch (error) {
    log(`Could not generate 3MF: ${error.message}`);
  } finally {
    showLoader(false);
  }
}

async function ensureDownloadAllowed(model) {
  if (model && !canAccessModel(model)) {
    openPlansPanel("Activate a Creator plan to download 3MF production files.");
    log(`${model.name}: ${t("lockedModel")}.`);
    return false;
  }
  if (state.account.role === "visitor" || !sessionToken()) {
    openPlansPanel("Create a local account with the reusable activation code received with your purchase.");
    log("Create an account and activate a Creator plan before downloading 3MF.");
    return false;
  }
  if (!hasCreatorAccess()) {
    openPlansPanel("Activate a Creator plan to export 3MF production files.");
    log("A Creator plan is required before exporting 3MF production files.");
    return false;
  }
  await loadDownloadQuota({ silent: true });
  return true;
}

async function generateStl() {
  showLoader(true, "Generating STL", "Writing the current geometry...");
  await waitFrame();
  try {
    const mesh = collectCurrentMesh();
    if (!mesh.triangles.length) throw new Error("brak geometrii do eksportu");
    downloadText(`${slugify(state.modelName)}.stl`, makeAsciiStl(mesh), "model/stl");
    log(`Generated STL locally: ${mesh.triangles.length.toLocaleString("en-US")} triangles.`);
  } catch (error) {
    log(`Could not generate STL: ${error.message}`);
  } finally {
    showLoader(false);
  }
}

async function downloadAssemblyPackage() {
  showLoader(true, "Packaging kit", "Collecting selected components and manifest...");
  await waitFrame();
  try {
    const selected = getSelectedUploadedComponents();
    const manifest = buildAssemblyManifest(selected);
    const files = {
      "frame-lab-assembly.json": strToU8(JSON.stringify(manifest, null, 2))
    };
    for (const item of selected) {
      const stored = await getComponentRecord(item.id);
      if (!stored?.fileBlob) continue;
      const bytes = new Uint8Array(await stored.fileBlob.arrayBuffer());
      files[`components/${item.role}-${item.size}-${item.fileName}`] = bytes;
    }
    const zipped = zipSync(files);
    downloadBlob(`${slugify(state.modelName)}-assembly.zip`, new Blob([zipped], { type: "application/zip" }));
    log(`Packaged kit: ${selected.length} component files and JSON manifest.`);
  } catch (error) {
    log(`Could not package kit: ${error.message}`);
  } finally {
    showLoader(false);
  }
}

function getSelectedUploadedComponents() {
  const selected = [
    { role: "front", item: selectedFront(), size: state.assemblySize },
    { role: "leftTemple", item: selectedTemple("leftTemple"), size: state.assemblySize },
    { role: "rightTemple", item: selectedTemple("rightTemple"), size: state.assemblySize },
    { role: "lens", item: selectedLens(), size: state.assemblySize }
  ];
  return selected
    .filter(({ item }) => item?.source === "uploaded")
    .map(({ role, item, size }) => ({
      role,
      id: item.id,
      name: item.name,
      size,
      connector: item.connector,
      format: item.format,
      fileName: item.fileName
    }));
}

function buildAssemblyManifest(selectedFiles) {
  return {
    app: "Frame Lab",
    version: 1,
    createdAt: new Date().toISOString(),
    assembly: {
      size: state.assemblySize,
      front: serializeAssemblyPart("front", selectedFront(), state.assemblySize),
      leftTemple: serializeAssemblyPart("leftTemple", selectedTemple("leftTemple"), state.assemblySize),
      rightTemple: serializeAssemblyPart("rightTemple", selectedTemple("rightTemple"), state.assemblySize),
      lens: serializeAssemblyPart("lens", selectedLens(), state.assemblySize)
    },
    parameters: state.params,
    lens: currentLensConfig(),
    colors: { ...state.componentColors },
    colorSlots: normalizeColorSlots(state.colorSlots),
    selectedFiles
  };
}

function serializeAssemblyPart(role, item, size) {
  if (!item) {
    return {
      role,
      id: null,
      name: null,
      size: null,
      connector: null,
      source: "none",
      format: null,
      fileName: null
    };
  }
  return {
    role,
    id: item.id,
    name: item.name,
    size,
    connector: item.connector,
    source: item.source || "demo",
    format: item.format || "generated",
    fileName: item.fileName || null
  };
}

function currentLensConfig() {
  const lens = selectedLens();
  return {
    mode: lens ? "component" : "none",
    label: lens?.name || "No lenses",
    note: lens?.fileName || "No lens model selected"
  };
}

function currentConfigurationSnapshot() {
  const model = currentModelRecord();
  const manifest = buildAssemblyManifest(getSelectedUploadedComponents());
  return {
    model: {
      id: model?.id || state.activeModelId,
      name: state.modelName,
      access: modelAccessPlan(model?.access)
    },
    assembly: manifest.assembly,
    parameters: { ...state.params },
    lens: manifest.lens,
    colors: manifest.colors,
    selectedFiles: manifest.selectedFiles
  };
}

async function recordDownload(fileName, mesh) {
  if (state.account.role === "visitor" || !sessionToken()) return false;
  const model = currentModelRecord();
  const payload = {
    fileName,
    modelId: model?.id || state.activeModelId,
    modelName: state.modelName,
    plan: state.account.role === "developer" ? "studio" : state.account.plan,
    lensMode: currentLensConfig().mode,
    lensLabel: selectedLensLabel(),
    configuration: {
      ...currentConfigurationSnapshot(),
      mesh: {
        triangles: mesh.triangles.length,
        vertices: mesh.vertices.length
      }
    }
  };
  try {
    const response = await apiRequest("/api/downloads", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    state.downloads = [response.download, ...state.downloads.filter((item) => item.id !== response.download.id)].slice(0, 100);
    state.downloadQuota = response.quota || state.downloadQuota;
    renderDownloadFolder();
    return true;
  } catch (error) {
    log(error.message || "Could not save download history.");
    return false;
  }
}

async function recordDesignDownload(fileName, mesh) {
  if (state.account.role === "visitor" || !sessionToken()) return false;
  const draft = designDefinitionFromDraft();
  const meshCounts = meshExportCounts(mesh);
  const payload = {
    fileName,
    modelId: state.designDraft.collectionId || "creator-draft",
    modelName: state.designDraft.name || "Creator frame",
    plan: state.account.role === "developer" ? "studio" : state.account.plan,
    lensMode: "component",
    lensLabel: "Generated acrylic lenses",
    configuration: {
      model: {
        id: state.designDraft.collectionId || "creator-draft",
        name: state.designDraft.name || "Creator frame",
        access: state.account.role === "developer" ? "studio" : state.account.plan
      },
      creator: draft,
      parameters: { ...state.designDraft.params },
      lens: { mode: "generated", label: "Generated acrylic lenses" },
      colors: {
        front: draft.frameColor,
        temples: draft.templeColor,
        lens: draft.lensColor,
        detail: draft.detailColor
      },
      mesh: {
        triangles: meshCounts.triangles,
        vertices: meshCounts.vertices
      }
    }
  };
  try {
    const response = await apiRequest("/api/downloads", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    state.downloads = [response.download, ...state.downloads.filter((item) => item.id !== response.download.id)].slice(0, 100);
    state.downloadQuota = response.quota || state.downloadQuota;
    renderDownloadFolder();
    return true;
  } catch (error) {
    setDesignNote(error.message || "Could not save Creator export history.");
    return false;
  }
}

function saveCurrentModel() {
  syncActiveModel();
  queueThumbnailCapture();
  log(`Saved model to gallery: ${state.modelName}.`);
}

function loadSample() {
  state.params = structuredClone(defaultParams);
  state.scadSource = sampleScad;
  state.modelName = "Frame 001";
  state.lensMode = selectedLens() ? "component" : "none";
  state.meshObject = null;
  buildControls();
  updateGeneratedSource();
  render();
  syncActiveModel();
  queueThumbnailCapture();
  log("Loaded the Frame Lab sample model.");
}

function resetParams() {
  state.params = structuredClone(defaultParams);
  state.lensMode = selectedLens() ? "component" : "none";
  state.meshObject = null;
  buildControls();
  updateGeneratedSource();
  render();
  syncActiveModel();
  queueThumbnailCapture();
  log("Parameters restored to the production baseline.");
}

function exportScad() {
  downloadText(`${slugify(state.modelName)}.scad`, generateScadSource(), "application/scad");
  log("Exported plik OpenSCAD.");
}

function exportJson() {
  downloadText(`${slugify(state.modelName)}-params.json`, JSON.stringify(state.params, null, 2), "application/json");
  log("Exported parameter JSON.");
}

async function copyScad() {
  await navigator.clipboard.writeText(generateScadSource());
  log("Copied OpenSCAD source to clipboard.");
}

function loadSettings() {
  state.lang = "en";
  try {
    const storedBrand = JSON.parse(getLocalStorageItem(brandSettingsStorageKey, "null") || "null");
    if (storedBrand) state.brandSettings = normalizeBrandSettings(storedBrand);
  } catch {
    state.brandSettings = structuredClone(defaultBrandSettings);
  }
  try {
    const hidden = JSON.parse(getLocalStorageItem(hiddenComponentsStorageKey, "[]") || "[]");
    state.hiddenComponentIds = new Set(Array.isArray(hidden) ? hidden.map(String) : []);
  } catch {
    state.hiddenComponentIds = new Set();
  }
  try {
    state.colorSlots = normalizeColorSlots(JSON.parse(getLocalStorageItem(colorSlotsStorageKey, "null") || "null"));
  } catch {
    state.colorSlots = [...defaultColorSlots];
  }
  try {
    const storedAccount = JSON.parse(getLocalStorageItem(accountStorageKey, "null") || "null");
    if (storedAccount && typeof storedAccount === "object") {
      const email = String(storedAccount.email || "").toLowerCase();
      const profile = accountProfile(email);
      state.account.email = email;
      state.account.firstName = profile?.firstName || storedAccount.firstName || "";
      state.account.lastName = profile?.lastName || storedAccount.lastName || "";
      state.account.role = isAdminEmail(email) ? "developer" : (profile?.role || storedAccount.role) === "customer" ? "customer" : "visitor";
      state.account.plan = state.account.role === "developer" ? "studio" : (validAccountPlan(profile?.plan || storedAccount.plan) ? (profile?.plan || storedAccount.plan) : "free");
      state.account.subscriptionMode = profile?.subscriptionMode || storedAccount.subscriptionMode || "free";
      state.account.subscriptionStatus = profile?.subscriptionStatus || storedAccount.subscriptionStatus || "none";
      state.account.planEndsAt = profile?.planEndsAt || storedAccount.planEndsAt || null;
      state.account.measurements = sanitizeMeasurements(profile?.measurements || storedAccount.measurements || {});
    }
  } catch {
    state.account = accountFromUser(null);
  }
  if (!sessionToken()) state.account = accountFromUser(null);
  document.documentElement.lang = "en";
}

function setView(view) {
  if (view === "front") state.viewerRotation = { x: 0, y: 0, z: 0 };
  if (view === "side") state.viewerRotation = { x: 0, y: Math.PI / 2, z: 0 };
  if (view === "iso") state.viewerRotation = { x: -0.48, y: 0.62, z: 0.03 };
  applyViewerTransform();
}

function handleCanvasWheel(event) {
  event.preventDefault();
  const direction = Math.exp(THREE.MathUtils.clamp(event.deltaY, -220, 220) * 0.0015);
  cameraZoomScale = THREE.MathUtils.clamp(cameraZoomScale * direction, 0.35, 3.4);
  updateCameraFromZoom();
}

function applyViewerTransform() {
  modelGroup.rotation.order = "YXZ";
  modelGroup.rotation.set(state.viewerRotation.x, state.viewerRotation.y, state.viewerRotation.z);
  modelGroup.position.set(modelBasePosition.x + state.viewerPan.x, modelBasePosition.y + state.viewerPan.y, modelBasePosition.z);
}

function normalizeOrbitAngle(angle) {
  return THREE.MathUtils.euclideanModulo(angle + Math.PI, Math.PI * 2) - Math.PI;
}

function viewerPanSpeed(canvasHeight = els.canvas?.clientHeight || 720) {
  const base = Math.max(0.045, viewerFitRadius / Math.max(440, canvasHeight));
  return base * Math.max(0.65, Math.min(1.35, cameraZoomScale));
}

function resetViewerPose() {
  state.viewerRotation = { x: -0.48, y: 0.62, z: 0.03 };
  state.viewerPan = { x: 0, y: 0 };
  cameraZoomScale = 1;
  render();
}

function updateMetrics() {
  els.metricWidth.textContent = Math.round(state.params.head_width);
  els.metricBridge.textContent = formatNumber(state.params.bridge_width);
  els.metricTemple.textContent = Math.round(state.params.temple_length);
}

function resize() {
  const rect = els.canvas.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function animate() {
  if (renderer && scene && camera) {
    resize();
    renderer.render(scene, camera);
  }
  if (designRenderer && designScene && designCamera) {
    resizeDesignScene();
    designRenderer.render(designScene, designCamera);
  }
  requestAnimationFrame(animate);
}

function fitCameraToObject(object) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  viewerFitRadius = Math.max(1, sphere.radius);
  cameraBaseDistance = Math.max(95, sphere.radius * 1.85);
  cameraBaseHeight = sphere.radius * 0.32;
  const panelShift = sphere.radius * 0.32;
  cameraTarget.set(sphere.center.x + panelShift, sphere.center.y, sphere.center.z);
  updateCameraFromZoom();
}

function updateCameraFromZoom() {
  if (!camera) return;
  camera.position.set(cameraTarget.x, cameraTarget.y + cameraBaseHeight, cameraTarget.z + cameraBaseDistance);
  camera.lookAt(cameraTarget);
  camera.zoom = 1 / cameraZoomScale;
  camera.near = Math.max(0.1, cameraBaseDistance / 100);
  camera.far = cameraBaseDistance * 8;
  camera.updateProjectionMatrix();
}

function addTriangles(geometry, multiplier = 1) {
  const position = geometry.getAttribute("position");
  if (!position) return;
  triangleCount += Math.floor(position.count / 3) * multiplier;
}

function findParam(key) {
  return parameterSchema.find(([item]) => item === key);
}

function formatValue(value, unit) {
  return `${formatNumber(Number(value))}${unit ? ` ${unit}` : ""}`;
}

function formatNumber(value) {
  return Number(value).toFixed(2).replace(/\.?0+$/, "");
}

function log(message) {
  els.importLog.textContent = message;
}

function showLoader(visible, title = "Preparing file", text = "Preparing production geometry...") {
  els.loaderOverlay.hidden = !visible;
  els.loaderTitle.textContent = title;
  els.loaderText.textContent = text;
}

function collectCurrentMesh() {
  return collectMeshFromObject(modelGroup);
}

function makeExportMaterialsOpaque(root) {
  root.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const makeOpaque = (material) => {
      if (!material) return material;
      const clone = material.clone();
      clone.transparent = false;
      clone.opacity = 1;
      clone.depthWrite = true;
      if ("transmission" in clone) clone.transmission = 0;
      clone.needsUpdate = true;
      return clone;
    };
    child.material = Array.isArray(child.material)
      ? child.material.map((material) => makeOpaque(material))
      : makeOpaque(child.material);
  });
}

function collectMeshFromObject(root) {
  root.updateMatrixWorld(true);
  const vertices = [];
  const triangles = [];
  const vertexMap = new Map();
  const addVertex = (vector) => {
    const key = `${vector.x.toFixed(5)},${vector.y.toFixed(5)},${vector.z.toFixed(5)}`;
    if (vertexMap.has(key)) return vertexMap.get(key);
    const index = vertices.length;
    vertices.push({ x: vector.x, y: vector.y, z: vector.z });
    vertexMap.set(key, index);
    return index;
  };

  root.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    const geometry = child.geometry;
    const position = geometry.getAttribute("position");
    if (!position) return;
    const index = geometry.index;
    const matrix = child.matrixWorld;
    const readVertex = (i) => new THREE.Vector3(position.getX(i), position.getY(i), position.getZ(i)).applyMatrix4(matrix);
    const triangleTotal = index ? Math.floor(index.count / 3) : Math.floor(position.count / 3);
    for (let i = 0; i < triangleTotal; i += 1) {
      const aIndex = index ? index.getX(i * 3) : i * 3;
      const bIndex = index ? index.getX(i * 3 + 1) : i * 3 + 1;
      const cIndex = index ? index.getX(i * 3 + 2) : i * 3 + 2;
      const a = readVertex(aIndex);
      const b = readVertex(bIndex);
      const c = readVertex(cIndex);
      if (triangleArea(a, b, c) < 1e-8) continue;
      triangles.push([addVertex(a), addVertex(b), addVertex(c)]);
    }
  });

  return { vertices, triangles };
}

function meshExportCounts(meshOrMeshes) {
  const meshes = Array.isArray(meshOrMeshes) ? meshOrMeshes : [meshOrMeshes];
  return meshes.reduce((totals, mesh) => {
    const triangles = Array.isArray(mesh?.triangles)
      ? mesh.triangles.length
      : Math.max(0, Math.floor(Number(mesh?.triangles ?? mesh?.triangleCount ?? 0)));
    const vertices = Array.isArray(mesh?.vertices)
      ? mesh.vertices.length
      : Math.max(0, Math.floor(Number(mesh?.vertices ?? mesh?.vertexCount ?? 0)));
    totals.triangles += triangles;
    totals.vertices += vertices;
    return totals;
  }, { triangles: 0, vertices: 0 });
}

function make3mfBytes(mesh, options = {}) {
  const title = options.title || state.modelName;
  const lens = options.lens || lensModeLabel();
  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">${escapeXml(title)}</metadata>
  <metadata name="Designer">Frame Lab</metadata>
  <metadata name="Lens">${escapeXml(lens)}</metadata>
  <resources>
    <object id="1" type="model">
      <mesh>
        <vertices>
${mesh.vertices.map((vertex) => `          <vertex x="${formatMeshNumber(vertex.x)}" y="${formatMeshNumber(vertex.y)}" z="${formatMeshNumber(vertex.z)}"/>`).join("\n")}
        </vertices>
        <triangles>
${mesh.triangles.map(([a, b, c]) => `          <triangle v1="${a}" v2="${b}" v3="${c}"/>`).join("\n")}
        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="1"/>
  </build>
</model>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;

  return zipSync({
    "[Content_Types].xml": strToU8(contentTypes),
    "_rels/.rels": strToU8(rels),
    "3D/3dmodel.model": strToU8(modelXml)
  });
}

function make3mfBlob(mesh, options = {}) {
  const zipped = make3mfBytes(mesh, options);
  return new Blob([zipped], { type: "model/3mf" });
}

function makeAsciiStl(mesh) {
  const lines = [`solid ${slugify(state.modelName)}`];
  mesh.triangles.forEach(([ia, ib, ic]) => {
    const a = mesh.vertices[ia];
    const b = mesh.vertices[ib];
    const c = mesh.vertices[ic];
    const normal = triangleNormal(a, b, c);
    lines.push(`  facet normal ${formatMeshNumber(normal.x)} ${formatMeshNumber(normal.y)} ${formatMeshNumber(normal.z)}`);
    lines.push("    outer loop");
    lines.push(`      vertex ${formatMeshNumber(a.x)} ${formatMeshNumber(a.y)} ${formatMeshNumber(a.z)}`);
    lines.push(`      vertex ${formatMeshNumber(b.x)} ${formatMeshNumber(b.y)} ${formatMeshNumber(b.z)}`);
    lines.push(`      vertex ${formatMeshNumber(c.x)} ${formatMeshNumber(c.y)} ${formatMeshNumber(c.z)}`);
    lines.push("    endloop");
    lines.push("  endfacet");
  });
  lines.push(`endsolid ${slugify(state.modelName)}`);
  return lines.join("\n");
}

function triangleArea(a, b, c) {
  const ab = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
  const ac = new THREE.Vector3(c.x - a.x, c.y - a.y, c.z - a.z);
  return ab.cross(ac).length() * 0.5;
}

function triangleNormal(a, b, c) {
  const ab = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
  const ac = new THREE.Vector3(c.x - a.x, c.y - a.y, c.z - a.z);
  return ab.cross(ac).normalize();
}

function formatMeshNumber(value) {
  return Number(value).toFixed(5).replace(/\.?0+$/, "");
}

function formatSvgNumber(value) {
  return Number(value).toFixed(3).replace(/\.?0+$/, "");
}

function escapeXml(value) {
  return String(value).replace(/[<>&"']/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "\"": "&quot;",
    "'": "&apos;"
  })[char]);
}

function escapeHtml(value) {
  return String(value).replace(/[<>&"']/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function downloadText(name, content, type) {
  const blob = new Blob([content], { type });
  downloadBlob(name, blob);
}

function downloadBlob(name, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function waitFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function openComponentDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(componentDbName, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(componentStoreName, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadComponentRecords() {
  const remote = await loadBackendComponentRecords().catch(() => []);
  if (remote.length) return remote;
  return loadLocalComponentRecords().catch(() => []);
}

async function loadLocalComponentRecords() {
  const db = await openComponentDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(componentStoreName, "readonly").objectStore(componentStoreName).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadBackendComponentRecords() {
  const payload = await apiRequest("/api/components");
  const components = Array.isArray(payload.components) ? payload.components : [];
  return components.map(componentRecordFromBackend).filter(Boolean);
}

async function loadBackendComponentRecord(id) {
  if (!id) return null;
  const payload = await apiRequest(`/api/components/${encodeURIComponent(id)}`);
  return componentRecordFromBackend(payload.component);
}

function componentRecordFromBackend(record) {
  if (!record || typeof record !== "object") return null;
  const component = { ...record, source: "uploaded" };
  if (record.fileData) {
    component.fileBlob = dataUrlToFile(record.fileData, record.fileName || `component.${record.format || "3mf"}`);
  }
  delete component.fileData;
  return component;
}

async function getComponentRecord(id) {
  const local = await getLocalComponentRecord(id).catch(() => null);
  if (local?.fileBlob) return local;
  const remote = await loadBackendComponentRecord(id).catch(() => null);
  return remote || local || null;
}

async function getLocalComponentRecord(id) {
  const db = await openComponentDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(componentStoreName, "readonly").objectStore(componentStoreName).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveComponentRecord(component, file) {
  await Promise.allSettled([
    saveLocalComponentRecord(component, file),
    saveComponentRecordToBackend(component, file)
  ]);
}

async function saveLocalComponentRecord(component, file) {
  const db = await openComponentDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(componentStoreName, "readwrite");
    tx.objectStore(componentStoreName).put({ ...component, fileBlob: file });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteComponentRecord(id) {
  await Promise.allSettled([
    deleteLocalComponentRecord(id),
    deleteComponentRecordFromBackend(id)
  ]);
}

async function saveComponentRecordToBackend(component, file) {
  if (!isDeveloper() || !sessionToken()) return false;
  const fileData = await readFileAsDataUrl(file);
  await apiRequest("/api/components", {
    method: "PUT",
    body: JSON.stringify({ component: { ...component, fileData } })
  });
  return true;
}

async function deleteComponentRecordFromBackend(id) {
  if (!isDeveloper() || !sessionToken()) return false;
  await apiRequest(`/api/components/${encodeURIComponent(id)}`, { method: "DELETE" });
  return true;
}

async function deleteLocalComponentRecord(id) {
  const db = await openComponentDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(componentStoreName, "readwrite");
    tx.objectStore(componentStoreName).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function dataUrlToFile(dataUrl, fileName) {
  const [header, payload] = String(dataUrl || "").split(",");
  if (!header || !payload) return null;
  const mime = header.match(/^data:([^;]+)/)?.[1] || "application/octet-stream";
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  try {
    return new File([bytes], fileName, { type: mime });
  } catch {
    return new Blob([bytes], { type: mime });
  }
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "model";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
