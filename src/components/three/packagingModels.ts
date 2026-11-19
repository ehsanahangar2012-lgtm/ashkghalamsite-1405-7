import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { AppView } from '../../types';

export type PackagingModelId =
  | 'giftBox'
  | 'windowBox'
  | 'fefco0427'
  | 'pharmaCarton'
  | 'slidingSleeve';

export interface ServiceHotspotSpec {
  id: string;
  label: string;
  serviceTitle: string;
  spec: string;
  description: string;
  localPoint: [number, number, number];
  targetView: AppView;
  ctaText: string;
}

export interface PackagingModelSpec {
  id: PackagingModelId;
  code: string;
  nameFa: string;
  subtitleFa: string;
  serviceCategoryFa: string;
  serviceSlug: string;
  defaultDims: { length: number; width: number; height: number };
  defaultBoardId: string;
  defaultFoilId: string;
  specs: string[];
  hotspots: ServiceHotspotSpec[];
}

export const PACKAGING_MODELS: PackagingModelSpec[] = [
  {
    id: 'giftBox',
    code: 'HARDBOX · LUXURY',
    nameFa: 'هاردباکس مگنتی صادراتی',
    subtitleFa: 'ساختار سخت ۲.۵ میلی‌متری با مغزی و روکش مخمل یا سلفون مات',
    serviceCategoryFa: 'چاپ افست ۵ رنگ و طلاکوب لوکس',
    serviceSlug: '/services/offset-printing',
    defaultDims: { length: 2.8, width: 2.1, height: 0.85 },
    defaultBoardId: 'carbon',
    defaultFoilId: 'gold24k',
    specs: ['مغزی مقوای سخت ۲.۵mm', 'طلاکوب داغ ۲۴ عیار + UV موضعی', 'قفل مگنتی مخفی و فوم برش‌خورده'],
    hotspots: [
      {
        id: 'foil-lid',
        label: 'طلاکوب ۲۴ عیار و لوگو',
        serviceTitle: 'چاپ افست ۵ رنگ و طلاکوب حرارتی',
        spec: 'کلیشه برنجی CNC · دقت ±0.1mm',
        description: 'اجرای هم‌زمان طلاکوب داغ، برجسته‌سازی (Emboss) و یووی موضعی با خشک‌کن این‌لاین بر روی شیت‌های افست.',
        localPoint: [0, 0.92, 0],
        targetView: AppView.DESIGN_STUDIO,
        ctaText: 'طراحی گرافیک در استودیو آنلاین',
      },
      {
        id: 'magnetic-wall',
        label: 'دیواره مگنتی و لولای سخت',
        serviceTitle: 'تولید هاردباکس و بسته‌بندی صادراتی',
        spec: 'تخته‌مقوای فشرده ۱۲۰۰ گرم · روکش مخملی',
        description: 'برش V-Groove نود درجه برای ایجاد لبه‌های تیز و مهندسی‌شده همراه با مگنت‌های نئودیمیوم مخفی.',
        localPoint: [1.42, 0.45, 0.6],
        targetView: AppView.INQUIRY,
        ctaText: 'استعلام قیمت تیراژ هاردباکس',
      },
    ],
  },
  {
    id: 'windowBox',
    code: 'DIE-CUT · WINDOW',
    nameFa: 'جعبه ویندودار لوکس اشک قلم',
    subtitleFa: 'برش پنجره کریستالی PET با کلاف دوبل و استحکام نمایشگاهی',
    serviceCategoryFa: 'مهندسی قالب دایکات و تیغ لیزری',
    serviceSlug: '/services/die-cutting-engineering',
    defaultDims: { length: 2.8, width: 2.6, height: 0.55 },
    defaultBoardId: 'kraft',
    defaultFoilId: 'gold24k',
    specs: ['پنجره شفاف PET ضدخش', 'تیغ لیزری با تلورانس ±0.15mm', 'دیواره دوبل خودبست بدون چسب'],
    hotspots: [
      {
        id: 'window-patch',
        label: 'پنجره شفاف و برش لیزری',
        serviceTitle: 'دایکات صنعتی و پنجره‌چسبانی (Window Patching)',
        spec: 'طلق شفاف PET ۰.۲۵mm · برش Bobst',
        description: 'نمایش مستقیم محصول بدون باز شدن درب با برش دقیق دایکات و چسب‌زنی اتوماتیک طلق شفاف.',
        localPoint: [0, 0.6, 0],
        targetView: AppView.DIELINE_GENERATOR,
        ctaText: 'ساخت دایلاین در جعبه‌ساز ۳D',
      },
      {
        id: 'crease-hinge',
        label: 'خط تا و لولای مهندسی',
        serviceTitle: 'مهندسی قالب و خطوط تا (Crease Matrix)',
        spec: 'جبران ضخامت ورق · خروجی DXF',
        description: 'محاسبه دقیق جبران ضخامت مقوا در زاویه ۹۰ درجه جهت جلوگیری از ترک‌خوردگی روکش چاپی.',
        localPoint: [-1.42, 0.28, 0.5],
        targetView: AppView.AUTOCAD_STUDIO,
        ctaText: 'باز کردن در اتوکد آنلاین',
      },
    ],
  },
  {
    id: 'fefco0427',
    code: 'FEFCO 0427 · E-FLUTE',
    nameFa: 'جعبه کیبوردی خودبست (Mailer)',
    subtitleFa: 'استاندارد بین‌المللی حمل‌ونقل تجارت الکترونیک و پیتزا با قفل سه‌گانه',
    serviceCategoryFa: 'تولید ورق و کارتن ۳ و ۵ لایه صنعتی',
    serviceSlug: '/services/corrugated-packaging',
    defaultDims: { length: 2.9, width: 2.4, height: 0.52 },
    defaultBoardId: 'sbs',
    defaultFoilId: 'rosegold',
    specs: ['فلوت E / B مقاوم در چیدمان پالت', 'محاسبه آنلاین مقاومت فشاری BCT', 'قفل بغل بدون نیاز به چسب'],
    hotspots: [
      {
        id: 'flute-strength',
        label: 'مقاومت فشاری BCT و فلوت',
        serviceTitle: 'تحلیل استحکام کارتن ۳ لایه و ۵ لایه',
        spec: 'آزمون McKee BCT · فلوت E / B / BC',
        description: 'مهندسی گام موج فلوت و گرماژ کرافت برای تحمل فشار چیدمان ستونی در سردخانه و کانتینر صادراتی.',
        localPoint: [0, 0.26, 1.24],
        targetView: AppView.PRODUCTS,
        ctaText: 'مشاهده رده‌های کارتن صنعتی',
      },
      {
        id: 'dieline-lock',
        label: 'زبانه‌های قفل خودبست',
        serviceTitle: 'طراحی پارامتریک کدهای FEFCO',
        spec: 'استاندارد FEFCO 0427 · بهینه‌سازی شیت',
        description: 'چیدمان بهینه فرم زینک روی شیت ۷۰×۱۰۰ برای کمترین دورریز کاغذ و مونتاژ سریع خط بسته‌بندی.',
        localPoint: [1.46, 0.35, -0.3],
        targetView: AppView.DIELINE_GENERATOR,
        ctaText: 'تغییر ابعاد این قالب در ۳D',
      },
    ],
  },
  {
    id: 'pharmaCarton',
    code: 'ECMA A20.20 · PHARMA',
    nameFa: 'جعبه دارویی و آرایشی استاندارد',
    subtitleFa: 'مقوای ایندربرد بهداشتی ۳۵۰ گرم با زبانه‌های متقابل و دقت خطوط خط تا',
    serviceCategoryFa: 'مدل‌سازی سه‌بعدی و ماکت قبل از تیراژ',
    serviceSlug: '/services/structural-3d-cad',
    defaultDims: { length: 1.55, width: 1.35, height: 1.45 },
    defaultBoardId: 'sbs',
    defaultFoilId: 'silver',
    specs: ['ایندربرد بهداشتی SBS ۳۵۰ گرم', 'شبیه‌سازی باز و بسته شدن قبل از تیراژ', 'قابلیت چاپ بریل و برجسته'],
    hotspots: [
      {
        id: 'tuck-flap',
        label: 'زبانه متقابل دارویی',
        serviceTitle: 'ماکت سه‌بعدی و تست فیتینگ قبل از چاپ',
        spec: 'خط تا استاندارد ECMA · تلورانس ۰.۱mm',
        description: 'بررسی تداخل زبانه‌ها، جهت الیاف کاغذ (Grain Direction) و خط چسب پیش از ساخت تیغ قالب.',
        localPoint: [0, 1.48, 0],
        targetView: AppView.DIELINE_GENERATOR,
        ctaText: 'تست ماکت در جعبه‌ساز ۳D',
      },
    ],
  },
  {
    id: 'slidingSleeve',
    code: 'ECMA C10 · SLEEVE',
    nameFa: 'کاور و کشوی صنعتی ریلی',
    subtitleFa: 'ساختار دوتکه کشویی لوکس مناسب هدایای شرکتی، عطر، زعفران و دیجیتال',
    serviceCategoryFa: 'چاپ تخصصی و طراحی گرافیک وکتور',
    serviceSlug: '/services/offset-printing',
    defaultDims: { length: 2.8, width: 1.9, height: 0.48 },
    defaultBoardId: 'royal',
    defaultFoilId: 'gold24k',
    specs: ['ساختار دوتکه کاور و کشو', 'طلاکوب و سلفون مخملی ضدخش', 'چیدمان اختصاصی روی شیت'],
    hotspots: [
      {
        id: 'sleeve-print',
        label: 'کاور چاپی و روکش مخملی',
        serviceTitle: 'چاپ افست و سلفون‌کشی مخملی',
        spec: 'رنگ پنتون اختصاصی + سلفون Soft-Touch',
        description: 'روکش لمس مخملی ضد اثر انگشت با درخشش کنتراست‌دار طلاکوب داغ روی بدنه کشویی.',
        localPoint: [0, 0.54, 0],
        targetView: AppView.DESIGN_STUDIO,
        ctaText: 'شروع طراحی گرافیک کاور',
      },
    ],
  },
];

function easeInOutCubic(t: number): number {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export interface ArticulatedPanel {
  id: string;
  parentId: string | null;
  pivot: [number, number, number];
  size: [number, number, number];
  offset: [number, number, number];
  foldAxis: 'x' | 'z';
  foldDirection: number;
  maxFoldAngle: number;
  foldStage: 'glue' | 'wall' | 'innerWall' | 'back' | 'dust' | 'lid' | 'flap';
  isLid?: boolean;
  isWindowLid?: boolean;
  isInnerTray?: boolean;
  isGlueTab?: boolean;
  taperDir?: 'z+' | 'z-' | 'x+' | 'x-';
  dynamicShift?: [number, number, number];
  group: THREE.Group;
  mesh: THREE.Mesh;
  wireMesh: THREE.Mesh;
  creaseLine?: THREE.Line;
}

export interface PackagingAssemblyResult {
  root: THREE.Group;
  panels: ArticulatedPanel[];
  applyFoldAndExplode: (foldProgress: number, explodeProgress: number) => void;
  setCadMode: (cadBlend: number, foldProgress?: number) => void;
}

function createTaperedPanelGeometry(
  sx: number,
  sy: number,
  sz: number,
  taperDir: 'z+' | 'z-' | 'x+' | 'x-'
): THREE.BufferGeometry {
  const hw = sx / 2;
  const hd = sz / 2;
  const shape = new THREE.Shape();

  if (taperDir === 'z+') {
    const ch = Math.min(sx * 0.2, sz * 0.45);
    shape.moveTo(-hw, -hd);
    shape.lineTo(hw, -hd);
    shape.lineTo(Math.max(0.02, hw - ch), hd);
    shape.lineTo(-Math.max(0.02, hw - ch), hd);
    shape.closePath();
  } else if (taperDir === 'z-') {
    const ch = Math.min(sx * 0.2, sz * 0.45);
    shape.moveTo(-Math.max(0.02, hw - ch), -hd);
    shape.lineTo(Math.max(0.02, hw - ch), -hd);
    shape.lineTo(hw, hd);
    shape.lineTo(-hw, hd);
    shape.closePath();
  } else if (taperDir === 'x-') {
    const ch = Math.min(sz * 0.2, sx * 0.45);
    shape.moveTo(-hw, -Math.max(0.02, hd - ch));
    shape.lineTo(hw, -hd);
    shape.lineTo(hw, hd);
    shape.lineTo(-hw, Math.max(0.02, hd - ch));
    shape.closePath();
  } else {
    const ch = Math.min(sz * 0.2, sx * 0.45);
    shape.moveTo(-hw, -hd);
    shape.lineTo(hw, -Math.max(0.02, hd - ch));
    shape.lineTo(hw, Math.max(0.02, hd - ch));
    shape.lineTo(-hw, hd);
    shape.closePath();
  }

  const extrude = new THREE.ExtrudeGeometry(shape, {
    depth: sy,
    bevelEnabled: false,
    curveSegments: 1,
  });
  // Extrude is in XY along +Z; rotate +90deg X maps (x, y, z) -> (x, -z, y)
  // Then translate +sy/2 so local Y spans [-sy/2, +sy/2] cleanly matching RoundedBoxGeometry
  extrude.rotateX(Math.PI / 2);
  extrude.translate(0, sy / 2, 0);
  extrude.computeVertexNormals();
  return extrude;
}

export function buildPackagingAssembly(
  modelId: PackagingModelId,
  L: number,
  W: number,
  H: number,
  boardMat: THREE.MeshPhysicalMaterial,
  innerMat: THREE.MeshPhysicalMaterial,
  foilMat: THREE.MeshPhysicalMaterial,
  colorLogoMat: THREE.MeshPhysicalMaterial,
  glassMat: THREE.MeshPhysicalMaterial,
  wireMat: THREE.MeshBasicMaterial,
  edgeMat: THREE.LineBasicMaterial,
  creaseMat: THREE.LineDashedMaterial
): PackagingAssemblyResult {
  const root = new THREE.Group();
  const t = 0.032;

  interface RawPanel {
    id: string;
    parentId: string | null;
    pivot: [number, number, number];
    size: [number, number, number];
    offset: [number, number, number];
    foldAxis: 'x' | 'z';
    foldDirection: number;
    maxFoldAngle: number;
    foldStage: 'glue' | 'wall' | 'innerWall' | 'back' | 'dust' | 'lid' | 'flap';
    isLid?: boolean;
    isWindowLid?: boolean;
    isInnerTray?: boolean;
    isGlueTab?: boolean;
    taperDir?: 'z+' | 'z-' | 'x+' | 'x-';
    dynamicShift?: [number, number, number];
  }

  let defs: RawPanel[] = [];

  if (modelId === 'giftBox') {
    const lidL = L + 0.04;
    const lidW = W + 0.04;
    const earW = Math.min(W * 0.24, 0.28);
    defs = [
      { id: 'bottom', parentId: null, pivot: [0, 0, 0], size: [L, t, W], offset: [0, t / 2, 0], foldAxis: 'x', foldDirection: 0, maxFoldAngle: 0, foldStage: 'wall' },
      { id: 'left_wall', parentId: 'bottom', pivot: [-L / 2, 0, 0], size: [H, t, W], offset: [-H / 2, t / 2, 0], foldAxis: 'z', foldDirection: -1, maxFoldAngle: Math.PI / 2, foldStage: 'wall' },
      { id: 'right_wall', parentId: 'bottom', pivot: [L / 2, 0, 0], size: [H, t, W], offset: [H / 2, t / 2, 0], foldAxis: 'z', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'wall' },
      { id: 'front_wall', parentId: 'bottom', pivot: [0, 0, W / 2], size: [L, t, H], offset: [0, t / 2, H / 2], foldAxis: 'x', foldDirection: -1, maxFoldAngle: Math.PI / 2, foldStage: 'wall' },
      { id: 'front_glue_left', parentId: 'front_wall', pivot: [-L / 2, 0, H / 2], size: [earW, t * 0.8, H * 0.84], offset: [-earW / 2, t * 0.45, 0], foldAxis: 'z', foldDirection: -1, maxFoldAngle: Math.PI / 2, foldStage: 'glue', isGlueTab: true, taperDir: 'x-', dynamicShift: [t * 1.15, 0, 0] },
      { id: 'front_glue_right', parentId: 'front_wall', pivot: [L / 2, 0, H / 2], size: [earW, t * 0.8, H * 0.84], offset: [earW / 2, t * 0.45, 0], foldAxis: 'z', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'glue', isGlueTab: true, taperDir: 'x+', dynamicShift: [-t * 1.15, 0, 0] },
      { id: 'back_wall', parentId: 'bottom', pivot: [0, 0, -W / 2], size: [L, t, H], offset: [0, t / 2, -H / 2], foldAxis: 'x', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'back' },
      { id: 'back_glue_left', parentId: 'back_wall', pivot: [-L / 2, 0, -H / 2], size: [earW, t * 0.8, H * 0.84], offset: [-earW / 2, t * 0.45, 0], foldAxis: 'z', foldDirection: -1, maxFoldAngle: Math.PI / 2, foldStage: 'glue', isGlueTab: true, taperDir: 'x-', dynamicShift: [t * 1.15, 0, 0] },
      { id: 'back_glue_right', parentId: 'back_wall', pivot: [L / 2, 0, -H / 2], size: [earW, t * 0.8, H * 0.84], offset: [earW / 2, t * 0.45, 0], foldAxis: 'z', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'glue', isGlueTab: true, taperDir: 'x+', dynamicShift: [-t * 1.15, 0, 0] },
      // Lid uses offset Y = -t/2 with dynamicShift [0, t*(1-lidT), 0] so at flat=0 it is flush [0..t] and when closed (+180deg) it sits ON TOP of walls [H .. H+t]!
      { id: 'lid', parentId: 'back_wall', pivot: [0, t, -H], size: [lidL, t, lidW], offset: [0, -t / 2, -lidW / 2], foldAxis: 'x', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'lid', isLid: true, dynamicShift: [0, -t, 0] },
      { id: 'lid_front_flap', parentId: 'lid', pivot: [0, 0, -lidW], size: [L + 0.02, t * 0.9, H * 0.42], offset: [0, -t * 0.55, -(H * 0.42) / 2], foldAxis: 'x', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'flap' },
    ];
  } else if (modelId === 'slidingSleeve') {
    const lidL = L + 0.02;
    const lidW = W + 0.02;
    const earW = Math.min(W * 0.22, 0.24);
    defs = [
      { id: 'bottom', parentId: null, pivot: [0, 0, 0], size: [L, t, W], offset: [0, t / 2, 0], foldAxis: 'x', foldDirection: 0, maxFoldAngle: 0, foldStage: 'wall' },
      { id: 'front_wall', parentId: 'bottom', pivot: [0, 0, W / 2], size: [L, t, H], offset: [0, t / 2, H / 2], foldAxis: 'x', foldDirection: -1, maxFoldAngle: Math.PI / 2, foldStage: 'wall' },
      { id: 'back_wall', parentId: 'bottom', pivot: [0, 0, -W / 2], size: [L, t, H], offset: [0, t / 2, -H / 2], foldAxis: 'x', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'back' },
      { id: 'sleeve_glue_left', parentId: 'back_wall', pivot: [-L / 2, 0, -H / 2], size: [earW, t * 0.8, H * 0.8], offset: [-earW / 2, t * 0.45, 0], foldAxis: 'z', foldDirection: -1, maxFoldAngle: Math.PI / 2, foldStage: 'glue', isGlueTab: true, taperDir: 'x-', dynamicShift: [t * 1.35, 0, 0] },
      { id: 'sleeve_glue_right', parentId: 'back_wall', pivot: [L / 2, 0, -H / 2], size: [earW, t * 0.8, H * 0.8], offset: [earW / 2, t * 0.45, 0], foldAxis: 'z', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'glue', isGlueTab: true, taperDir: 'x+', dynamicShift: [-t * 1.35, 0, 0] },
      { id: 'left_tray', parentId: 'bottom', pivot: [-L / 2, 0, 0], size: [H * 0.88, t * 0.9, W - 0.06], offset: [-(H * 0.88) / 2, t / 2, 0], foldAxis: 'z', foldDirection: -1, maxFoldAngle: Math.PI / 2, foldStage: 'dust', isInnerTray: true },
      { id: 'right_tray', parentId: 'bottom', pivot: [L / 2, 0, 0], size: [H * 0.88, t * 0.9, W - 0.06], offset: [(H * 0.88) / 2, t / 2, 0], foldAxis: 'z', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'dust', isInnerTray: true },
      { id: 'lid', parentId: 'back_wall', pivot: [0, t, -H], size: [lidL, t, lidW], offset: [0, -t / 2, -lidW / 2], foldAxis: 'x', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'lid', isLid: true, dynamicShift: [0, -t, 0] },
    ];
  } else if (modelId === 'pharmaCarton') {
    const dustLen = Math.min(W * 0.36, L * 0.34);
    const glueDepth = 0.22;
    const tuckDepth = 0.32;
    defs = [
      { id: 'bottom', parentId: null, pivot: [0, 0, 0], size: [L, t, W], offset: [0, t / 2, 0], foldAxis: 'x', foldDirection: 0, maxFoldAngle: 0, foldStage: 'wall' },
      { id: 'back_wall', parentId: 'bottom', pivot: [0, 0, -W / 2], size: [L, t, H], offset: [0, t / 2, -H / 2], foldAxis: 'x', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'back' },
      { id: 'front_wall', parentId: 'bottom', pivot: [0, 0, W / 2], size: [L, t, H], offset: [0, t / 2, H / 2], foldAxis: 'x', foldDirection: -1, maxFoldAngle: Math.PI / 2, foldStage: 'wall' },
      { id: 'left_wall', parentId: 'bottom', pivot: [-L / 2, 0, 0], size: [H, t, W], offset: [-H / 2, t / 2, 0], foldAxis: 'z', foldDirection: -1, maxFoldAngle: Math.PI / 2, foldStage: 'wall' },
      { id: 'right_wall', parentId: 'bottom', pivot: [L / 2, 0, 0], size: [H, t, W], offset: [H / 2, t / 2, 0], foldAxis: 'z', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'wall' },
      // Chamfered glue tab (لب چسب) on left_wall extending +Z when flat, folding cleanly behind front_wall
      { id: 'glue_tab', parentId: 'left_wall', pivot: [-H / 2, 0, W / 2], size: [H * 0.88, t * 0.82, glueDepth], offset: [0, t * 0.45, glueDepth / 2], foldAxis: 'x', foldDirection: -1, maxFoldAngle: Math.PI / 2, foldStage: 'glue', isGlueTab: true, taperDir: 'z+', dynamicShift: [0, t * 0.5, -t * 1.25] },
      // Top Dust Flaps (گوشواره های بغل) on left & right walls: fold 90deg BEFORE lid closes, resting cleanly under lid [H-t .. H]
      { id: 'left_dust_flap', parentId: 'left_wall', pivot: [-H, 0, 0], size: [dustLen, t * 0.85, W * 0.86], offset: [-dustLen / 2, t * 0.45, 0], foldAxis: 'z', foldDirection: -1, maxFoldAngle: Math.PI / 2, foldStage: 'dust', taperDir: 'x-' },
      { id: 'right_dust_flap', parentId: 'right_wall', pivot: [H, 0, 0], size: [dustLen, t * 0.85, W * 0.86], offset: [dustLen / 2, t * 0.45, 0], foldAxis: 'z', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'dust', taperDir: 'x+' },
      // Top Lid rests strictly ON TOP of walls [H .. H+t]
      { id: 'lid', parentId: 'back_wall', pivot: [0, t, -H], size: [L + 0.01, t, W + 0.01], offset: [0, -t / 2, -(W + 0.01) / 2], foldAxis: 'x', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'lid', isLid: true, dynamicShift: [0, -t, 0] },
      // Lid Tuck Flap shifts +2.1t along local Z when folding so it slides smoothly INSIDE front_wall!
      { id: 'lid_front_flap', parentId: 'lid', pivot: [0, 0, -(W + 0.01)], size: [L - 0.07, t * 0.82, tuckDepth], offset: [0, -t * 0.5, -tuckDepth / 2], foldAxis: 'x', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'flap', taperDir: 'z-', dynamicShift: [0, 0, t * 2.1] },
    ];
  } else {
    const isWindow = modelId === 'windowBox';
    const lidL = L + 0.01;
    const lidW = W + 0.01;
    const lockEarW = Math.min(W * 0.34, 0.36);
    defs = [
      { id: 'bottom', parentId: null, pivot: [0, 0, 0], size: [L, t, W], offset: [0, t / 2, 0], foldAxis: 'x', foldDirection: 0, maxFoldAngle: 0, foldStage: 'wall' },
      { id: 'left_wall', parentId: 'bottom', pivot: [-L / 2, 0, 0], size: [H, t, W], offset: [-H / 2, t / 2, 0], foldAxis: 'z', foldDirection: -1, maxFoldAngle: Math.PI / 2, foldStage: 'wall' },
      { id: 'left_wall_inner', parentId: 'left_wall', pivot: [-H, t, 0], size: [H - 0.04, t * 0.85, W - 0.08], offset: [-(H - 0.04) / 2, -t / 2, 0], foldAxis: 'z', foldDirection: -1, maxFoldAngle: Math.PI * 0.98, foldStage: 'innerWall', dynamicShift: [0, t, 0] },
      { id: 'right_wall', parentId: 'bottom', pivot: [L / 2, 0, 0], size: [H, t, W], offset: [H / 2, t / 2, 0], foldAxis: 'z', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'wall' },
      { id: 'right_wall_inner', parentId: 'right_wall', pivot: [H, t, 0], size: [H - 0.04, t * 0.85, W - 0.08], offset: [(H - 0.04) / 2, -t / 2, 0], foldAxis: 'z', foldDirection: 1, maxFoldAngle: Math.PI * 0.98, foldStage: 'innerWall', dynamicShift: [0, t, 0] },
      { id: 'front_wall', parentId: 'bottom', pivot: [0, 0, W / 2], size: [L, t, H], offset: [0, t / 2, H / 2], foldAxis: 'x', foldDirection: -1, maxFoldAngle: Math.PI / 2, foldStage: 'wall' },
      // Front corner lock ears (گوشواره های قفل جلو) fold inward before inner side walls sandwich them
      { id: 'front_left_ear', parentId: 'front_wall', pivot: [-L / 2, 0, H / 2], size: [lockEarW, t * 0.8, H * 0.82], offset: [-lockEarW / 2, t * 0.45, 0], foldAxis: 'z', foldDirection: -1, maxFoldAngle: Math.PI / 2, foldStage: 'dust', isGlueTab: true, taperDir: 'x-', dynamicShift: [t * 1.15, 0, 0] },
      { id: 'front_right_ear', parentId: 'front_wall', pivot: [L / 2, 0, H / 2], size: [lockEarW, t * 0.8, H * 0.82], offset: [lockEarW / 2, t * 0.45, 0], foldAxis: 'z', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'dust', isGlueTab: true, taperDir: 'x+', dynamicShift: [-t * 1.15, 0, 0] },
      { id: 'front_wall_inner', parentId: 'front_wall', pivot: [0, t, H], size: [L - 0.08, t * 0.85, H - 0.04], offset: [0, -t / 2, (H - 0.04) / 2], foldAxis: 'x', foldDirection: -1, maxFoldAngle: Math.PI * 0.98, foldStage: 'innerWall' },
      { id: 'back_wall', parentId: 'bottom', pivot: [0, 0, -W / 2], size: [L, t, H], offset: [0, t / 2, -H / 2], foldAxis: 'x', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'back' },
      // Lid sits strictly ON TOP of walls [H .. H+t]
      { id: 'lid', parentId: 'back_wall', pivot: [0, t, -H], size: [lidL, t, lidW], offset: [0, -t / 2, -lidW / 2], foldAxis: 'x', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'lid', isLid: true, isWindowLid: isWindow, dynamicShift: [0, -t, 0] },
      { id: 'lid_front_flap', parentId: 'lid', pivot: [0, 0, -lidW], size: [L - 0.14, t * 0.82, H * 0.82], offset: [0, -t * 0.5, -(H * 0.82) / 2], foldAxis: 'x', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'flap', taperDir: 'z-', dynamicShift: [0, 0, t * 3.1] },
      { id: 'lid_left_flap', parentId: 'lid', pivot: [-lidL / 2, 0, -lidW / 2], size: [H * 0.8, t * 0.82, W - 0.16], offset: [-(H * 0.8) / 2, -t * 0.5, 0], foldAxis: 'z', foldDirection: -1, maxFoldAngle: Math.PI / 2, foldStage: 'flap', taperDir: 'x-', dynamicShift: [t * 4.0, 0, 0] },
      { id: 'lid_right_flap', parentId: 'lid', pivot: [lidL / 2, 0, -lidW / 2], size: [H * 0.8, t * 0.82, W - 0.16], offset: [(H * 0.8) / 2, -t * 0.5, 0], foldAxis: 'z', foldDirection: 1, maxFoldAngle: Math.PI / 2, foldStage: 'flap', taperDir: 'x+', dynamicShift: [-t * 4.0, 0, 0] },
    ];
  }

  const panelMap: Record<string, ArticulatedPanel> = {};
  const panels: ArticulatedPanel[] = [];

  defs.forEach((def) => {
    const group = new THREE.Group();
    group.position.set(...def.pivot);

    const [sx, sy, sz] = def.size;
    const minDim = Math.min(sx, sy, sz);
    const bevelRadius = Math.min(0.0065, minDim * 0.28);
    const geom = def.taperDir
      ? createTaperedPanelGeometry(sx, sy, sz, def.taperDir)
      : new RoundedBoxGeometry(sx, sy, sz, 2, bevelRadius);
    geom.translate(...def.offset);

    const panelMat = def.isInnerTray || def.isGlueTab ? innerMat : boardMat;
    const mesh = new THREE.Mesh(geom, panelMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.layers.enable(1);

    if (def.isLid && def.isWindowLid) {
      const [fw, fh, fd] = def.size;
      const oy = def.offset[1]; // -fh/2
      const oz = def.offset[2];
      const winW = fw * 0.58;
      const winD = fd * 0.54;
      const sideW = (fw - winW) / 2;
      const sideD = (fd - winD) / 2;

      const frameParts: Array<[number, number, number, number, number, number]> = [
        [sideW, fh, fd, -fw / 2 + sideW / 2, oy, oz],
        [sideW, fh, fd, fw / 2 - sideW / 2, oy, oz],
        [winW, fh, sideD, 0, oy, oz - fd / 2 + sideD / 2],
        [winW, fh, sideD, 0, oy, oz + fd / 2 - sideD / 2],
      ];

      frameParts.forEach(([pw, ph, pd, px, py, pz]) => {
        const fg = new RoundedBoxGeometry(pw, ph, pd, 2, Math.min(0.005, Math.min(pw, ph, pd) * 0.25));
        fg.translate(px, py, pz);
        const fm = new THREE.Mesh(fg, boardMat);
        fm.castShadow = true;
        fm.receiveShadow = true;
        fm.layers.enable(1);
        group.add(fm);
      });

      mesh.visible = false;
      group.add(mesh);

      const glassGeom = new THREE.BoxGeometry(winW + 0.02, fh * 0.45, winD + 0.02);
      glassGeom.translate(0, oy, oz);
      const glassMesh = new THREE.Mesh(glassGeom, glassMat);
      glassMesh.renderOrder = 4;
      group.add(glassMesh);

      // Metallic foil window trim bezel on outer top surface (y = -fh under +180deg lid fold)
      const bezelStrip = new THREE.Mesh(
        new THREE.BoxGeometry(winW + 0.036, 0.004, 0.018).translate(0, oy - fh / 2 - 0.002, oz - winD / 2 - 0.012),
        foilMat
      );
      group.add(bezelStrip);

      const bezelGeom = new THREE.EdgesGeometry(new THREE.BoxGeometry(winW, fh + 0.004, winD).translate(0, oy, oz));
      const bezelLine = new THREE.LineSegments(bezelGeom, edgeMat);
      group.add(bezelLine);

      // Foil strip on front rim of window lid (local -Z maps to world +Z when closed)
      const stripGeom = new THREE.PlaneGeometry(fw * 0.72, fd * 0.16);
      stripGeom.rotateX(Math.PI / 2);
      stripGeom.translate(0, oy - fh / 2 - 0.004, oz - fd * 0.38);
      const stripMesh = new THREE.Mesh(stripGeom, foilMat);
      stripMesh.renderOrder = 6;
      group.add(stripMesh);

      const badgeSize = Math.min(sideD * 0.85, 0.34);
      const winLogoGeom = new THREE.PlaneGeometry(badgeSize, badgeSize);
      winLogoGeom.rotateX(Math.PI / 2);
      winLogoGeom.translate(0, oy - fh / 2 - 0.006, oz - fd * 0.38);
      const winLogoMesh = new THREE.Mesh(winLogoGeom, colorLogoMat);
      winLogoMesh.renderOrder = 7;
      group.add(winLogoMesh);
    } else {
      group.add(mesh);
    }

    // Add realistic laminated inner liner sheet on bottom & inner walls/lid
    if ((def.id === 'bottom' || (def.isLid && !def.isWindowLid)) && !def.isInnerTray) {
      const linerGeom = new THREE.PlaneGeometry(sx * 0.94, sz * 0.94);
      if (def.id === 'bottom') {
        linerGeom.rotateX(-Math.PI / 2);
        linerGeom.translate(def.offset[0], def.offset[1] + sy / 2 + 0.0015, def.offset[2]);
      } else {
        // Inner side of lid (local +y face = offset.y + sy/2 = 0)
        linerGeom.rotateX(-Math.PI / 2);
        linerGeom.translate(def.offset[0], def.offset[1] + sy / 2 + 0.0015, def.offset[2]);
      }
      const linerMesh = new THREE.Mesh(linerGeom, innerMat);
      linerMesh.receiveShadow = true;
      group.add(linerMesh);
    }

    // Physical luxury details & glue score strip per packaging architecture
    if (def.isGlueTab) {
      // Subtle matte adhesive strip across center of glue tab for industrial clarity
      const stripW = def.foldAxis === 'z' ? sx * 0.42 : sx * 0.82;
      const stripD = def.foldAxis === 'z' ? sz * 0.82 : sz * 0.42;
      const glueStripeGeo = new THREE.PlaneGeometry(stripW, stripD);
      glueStripeGeo.rotateX(-Math.PI / 2);
      glueStripeGeo.translate(def.offset[0], def.offset[1] + sy / 2 + 0.0018, def.offset[2]);
      const glueStripe = new THREE.Mesh(glueStripeGeo, creaseMat);
      group.add(glueStripe);
    }

    if (modelId === 'giftBox' && def.id === 'lid_front_flap') {
      // Twin metallic neodymium magnetic clasps embedded on front closure flap
      const claspGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.006, 20);
      [-L * 0.28, L * 0.28].forEach((mx) => {
        const clasp = new THREE.Mesh(claspGeo, foilMat);
        clasp.position.set(mx, def.offset[1] + sy / 2 + 0.002, def.offset[2]);
        group.add(clasp);
      });
    } else if (modelId === 'slidingSleeve' && def.id === 'front_wall') {
      const tabGeo = new RoundedBoxGeometry(0.24, 0.012, 0.08, 1, 0.004);
      const tabMesh = new THREE.Mesh(tabGeo, foilMat);
      tabMesh.position.set(0, def.offset[1] - sy / 2 - 0.004, def.offset[2]);
      group.add(tabMesh);
    } else if (modelId === 'pharmaCarton' && def.id === 'lid_front_flap') {
      const sealGeo = new THREE.PlaneGeometry(L * 0.52, 0.055);
      sealGeo.rotateX(-Math.PI / 2);
      sealGeo.translate(0, def.offset[1] + sy / 2 + 0.002, def.offset[2]);
      const sealMesh = new THREE.Mesh(sealGeo, foilMat);
      group.add(sealMesh);
    }

    if (def.isLid && !def.isWindowLid) {
      const [fw, fh, fd] = def.size;
      const oy = def.offset[1]; // -fh/2
      const oz = def.offset[2];
      const artSize = Math.min(fw, fd) * 0.78;

      // Outer TOP lid artwork: local -Y face (oy - fh/2 = -fh) faces UP (+Y world) when folded +180deg
      const topArt = new THREE.PlaneGeometry(artSize, artSize);
      topArt.rotateX(Math.PI / 2);
      topArt.translate(0, oy - fh / 2 - 0.003, oz);
      const topArtMesh = new THREE.Mesh(topArt, foilMat);
      topArtMesh.renderOrder = 6;
      group.add(topArtMesh);

      const logoPlaneSize = artSize * 0.44;
      const logoGeom = new THREE.PlaneGeometry(logoPlaneSize, logoPlaneSize);
      logoGeom.rotateX(Math.PI / 2);
      logoGeom.translate(0, oy - fh / 2 - 0.005, oz + artSize * 0.185);
      const logoMesh = new THREE.Mesh(logoGeom, colorLogoMat);
      logoMesh.renderOrder = 7;
      group.add(logoMesh);

      // Inner underside lid emblem (visible when lid opens)
      const innerArt = new THREE.PlaneGeometry(artSize * 0.85, artSize * 0.85);
      innerArt.rotateX(-Math.PI / 2);
      innerArt.translate(0, oy + fh / 2 + 0.004, oz);
      const innerArtMesh = new THREE.Mesh(innerArt, foilMat);
      innerArtMesh.renderOrder = 6;
      group.add(innerArtMesh);
    }

    // Uploaded brand emblem on front wall exterior when assembled
    if (def.id === 'front_wall' && H >= 0.45) {
      const [, , fd] = def.size;
      const oz = def.offset[2];
      const frontBadgeSize = Math.min(L * 0.24, fd * 0.72, 0.45);
      const frontLogoGeom = new THREE.PlaneGeometry(frontBadgeSize, frontBadgeSize);
      frontLogoGeom.rotateX(Math.PI / 2);
      frontLogoGeom.translate(0, -0.004, oz);
      const frontLogoMesh = new THREE.Mesh(frontLogoGeom, colorLogoMat);
      frontLogoMesh.renderOrder = 7;
      group.add(frontLogoMesh);
    }

    // Wireframe CAD overlay mesh
    const wireMesh = new THREE.Mesh(geom, wireMat);
    wireMesh.scale.setScalar(1.003);
    group.add(wireMesh);

    // Subtle precision cut/edge outline
    const edgeGeom = new THREE.EdgesGeometry(geom);
    const edgeLine = new THREE.LineSegments(edgeGeom, edgeMat);
    group.add(edgeLine);

    // Crease dashed score lines on hinges
    let creaseLine: THREE.Line | undefined;
    if (def.parentId) {
      const cGeom = new THREE.BufferGeometry();
      const span = def.foldAxis === 'z' ? sz * 0.46 : sx * 0.46;
      const yLine = def.isLid || def.foldStage === 'innerWall' ? 0.004 : t + 0.005;
      const pts =
        def.foldAxis === 'z'
          ? [0, yLine, -span, 0, yLine, span]
          : [-span, yLine, 0, span, yLine, 0];
      cGeom.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      creaseLine = new THREE.Line(cGeom, creaseMat);
      creaseLine.computeLineDistances();
      group.add(creaseLine);
    }

    const panel: ArticulatedPanel = {
      ...def,
      group,
      mesh,
      wireMesh,
      creaseLine,
    };
    panelMap[def.id] = panel;
    panels.push(panel);
  });

  panels.forEach((p) => {
    if (p.parentId && panelMap[p.parentId]) {
      panelMap[p.parentId].group.add(p.group);
    } else {
      root.add(p.group);
    }
  });

  const applyFoldAndExplode = (foldProgress: number, explodeProgress: number) => {
    const f = THREE.MathUtils.clamp(foldProgress, 0, 1);

    // Staggered realistic packaging folding sequence:
    // 1) Glue tabs (0.02..0.18) -> 2) Main walls (0.08..0.34) -> 3) Back & Dust flaps (0.28..0.56) -> 4) Inner walls / Tray (0.38..0.62) -> 5) Lid rests on top (0.56..0.82) -> 6) Tuck flaps lock in (0.78..1.00)
    const glueT = easeInOutCubic((f - 0.02) / 0.18);
    const wallT = easeInOutCubic((f - 0.08) / 0.26);
    const backT = easeInOutCubic((f - 0.24) / 0.24);
    const dustT = easeInOutCubic((f - 0.34) / 0.24);
    const innerWallT = easeInOutCubic((f - 0.44) / 0.20);
    const lidT = easeInOutCubic((f - 0.56) / 0.26);
    const flapT = easeInOutCubic((f - 0.78) / 0.22);

    const flatShiftZ = (W + H) * 0.42;
    root.position.z = (1 - easeInOutCubic(f)) * flatShiftZ;
    root.position.y = Math.sin(f * Math.PI) * 0.11;

    const lidOpenOffset = explodeProgress * 0.55;

    panels.forEach((p) => {
      let stageVal = 0;
      if (p.foldStage === 'glue') stageVal = glueT;
      else if (p.foldStage === 'wall') stageVal = wallT;
      else if (p.foldStage === 'back') stageVal = backT;
      else if (p.foldStage === 'dust') stageVal = dustT;
      else if (p.foldStage === 'innerWall') stageVal = innerWallT;
      else if (p.foldStage === 'lid') stageVal = Math.max(0, lidT - lidOpenOffset);
      else if (p.foldStage === 'flap') stageVal = Math.max(0, flapT - explodeProgress * 0.7);

      const angle = p.foldDirection * p.maxFoldAngle * stageVal;
      if (p.foldAxis === 'z') {
        p.group.rotation.z = angle;
      } else {
        p.group.rotation.x = angle;
      }

      if (p.parentId) {
        const exp = explodeProgress * 0.28;
        const shiftProgress = p.isLid ? lidT : stageVal;
        const dsX = p.dynamicShift ? p.dynamicShift[0] * shiftProgress : 0;
        const dsY = p.dynamicShift ? p.dynamicShift[1] * shiftProgress : 0;
        const dsZ = p.dynamicShift ? p.dynamicShift[2] * shiftProgress : 0;
        p.group.position.set(
          p.pivot[0] + dsX + (p.foldAxis === 'z' ? p.foldDirection * exp : 0),
          p.pivot[1] + dsY + (p.isLid ? exp * 1.4 : exp * 0.35),
          p.pivot[2] + dsZ + (p.foldAxis === 'x' ? -p.foldDirection * exp : 0)
        );
      }
    });
  };

  const setCadMode = (cadBlend: number, foldProgress = 1) => {
    const c = THREE.MathUtils.clamp(cadBlend, 0, 1);
    const dielineBoost = THREE.MathUtils.clamp(1 - foldProgress * 1.35, 0, 1);

    boardMat.opacity = 1 - c * 0.82;
    boardMat.transparent = c > 0.02;
    boardMat.depthWrite = c < 0.5;
    innerMat.opacity = 1 - c * 0.82;
    innerMat.transparent = c > 0.02;
    innerMat.depthWrite = c < 0.5;
    wireMat.opacity = c * 0.45;
    wireMat.visible = c > 0.02;
    edgeMat.opacity = Math.min(1, 0.055 + c * 0.78 + dielineBoost * 0.72);
    creaseMat.opacity = Math.min(1, 0.04 + c * 0.82 + dielineBoost * 0.78);
    foilMat.opacity = 1 - c * 0.85;
    foilMat.transparent = c > 0.02;
  };

  return {
    root,
    panels,
    applyFoldAndExplode,
    setCadMode,
  };
}
