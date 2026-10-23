export interface DxfValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  entityCount: number;
  totalLength: number;
}

type Point = { x: number; y: number };
type Segment = { a: Point; b: Point; pathIndex: number };

const parsePathSegments = (path: string, pathIndex: number): { segments: Segment[]; malformed: boolean; closed: boolean } => {
  const tokens = path.match(/[MLHVZ]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi) || [];
  const segments: Segment[] = [];
  let i=0, command='', current: Point | null=null, first: Point | null=null, closed=false, malformed=false;
  const number = () => {
    if (i >= tokens.length || /^[MLHVZ]$/i.test(tokens[i])) return null;
    const n=Number(tokens[i++]); return Number.isFinite(n)?n:null;
  };
  while(i<tokens.length){
    if (/^[MLHVZ]$/i.test(tokens[i])) command=tokens[i++].toUpperCase();
    if(!command){malformed=true;break;}
    if(command==='Z'){
      if(current&&first){
        if(Math.hypot(current.x-first.x,current.y-first.y)>1e-8) segments.push({a:current,b:first,pathIndex});
        current=first; closed=true;
      }
      command=''; continue;
    }
    if(command==='M'||command==='L'){
      const x=number(),y=number();
      if(x===null||y===null){malformed=true;break;}
      const next={x,y};
      if(command==='M'){current=next;first=next;command='L';}
      else {if(current)segments.push({a:current,b:next,pathIndex});else malformed=true;current=next;}
      continue;
    }
    if(command==='H'||command==='V'){
      const n=number(); if(n===null||!current){malformed=true;break;}
      const next=command==='H'?{x:n,y:current.y}:{x:current.x,y:n};
      segments.push({a:current,b:next,pathIndex});current=next;continue;
    }
    malformed=true;break;
  }
  if(!tokens.length) malformed=true;
  if(current&&first&&Math.hypot(current.x-first.x,current.y-first.y)<1e-8) closed=true;
  return {segments,malformed,closed};
};

const orientation = (a:Point,b:Point,c:Point) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const GEOMETRY_EPSILON = 1e-8;

const pointOnSegment = (p:Point,a:Point,b:Point) => {
  const length=Math.hypot(b.x-a.x,b.y-a.y);
  if(Math.abs(orientation(a,b,p))>GEOMETRY_EPSILON*Math.max(1,length))return false;
  return p.x>=Math.min(a.x,b.x)-GEOMETRY_EPSILON&&p.x<=Math.max(a.x,b.x)+GEOMETRY_EPSILON&&
    p.y>=Math.min(a.y,b.y)-GEOMETRY_EPSILON&&p.y<=Math.max(a.y,b.y)+GEOMETRY_EPSILON;
};

// Segment pairs reaching this function are non-adjacent. Therefore a shared
// endpoint or collinear overlap is a genuine non-adjacent contact, while normal
// adjoining corners are filtered by the caller before this test.
const intersects = (s1:Segment,s2:Segment) => {
  const {a,b}=s1,{a:c,b:d}=s2;
  const o1=orientation(a,b,c),o2=orientation(a,b,d),o3=orientation(c,d,a),o4=orientation(c,d,b);
  const properCrossing=
    ((o1>GEOMETRY_EPSILON&&o2< -GEOMETRY_EPSILON)||(o1< -GEOMETRY_EPSILON&&o2>GEOMETRY_EPSILON))&&
    ((o3>GEOMETRY_EPSILON&&o4< -GEOMETRY_EPSILON)||(o3< -GEOMETRY_EPSILON&&o4>GEOMETRY_EPSILON));
  return properCrossing||
    pointOnSegment(c,a,b)||pointOnSegment(d,a,b)||
    pointOnSegment(a,c,d)||pointOnSegment(b,c,d);
};

type SegmentContact = 'none' | 'endpoint' | 'tee' | 'crossing' | 'overlap';

const samePoint = (p: Point, q: Point) =>
  Math.hypot(p.x - q.x, p.y - q.y) <= GEOMETRY_EPSILON;

const boxesDisjoint = (s1: Segment, s2: Segment) =>
  Math.max(s1.a.x, s1.b.x) < Math.min(s2.a.x, s2.b.x) - GEOMETRY_EPSILON ||
  Math.max(s2.a.x, s2.b.x) < Math.min(s1.a.x, s1.b.x) - GEOMETRY_EPSILON ||
  Math.max(s1.a.y, s1.b.y) < Math.min(s2.a.y, s2.b.y) - GEOMETRY_EPSILON ||
  Math.max(s2.a.y, s2.b.y) < Math.min(s1.a.y, s1.b.y) - GEOMETRY_EPSILON;

const classifySegmentContact = (s1: Segment, s2: Segment): SegmentContact => {
  if (boxesDisjoint(s1, s2)) return 'none';
  const { a, b } = s1;
  const { a: c, b: d } = s2;
  const o1 = orientation(a, b, c), o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a), o4 = orientation(c, d, b);
  const properCrossing =
    ((o1 > GEOMETRY_EPSILON && o2 < -GEOMETRY_EPSILON) || (o1 < -GEOMETRY_EPSILON && o2 > GEOMETRY_EPSILON)) &&
    ((o3 > GEOMETRY_EPSILON && o4 < -GEOMETRY_EPSILON) || (o3 < -GEOMETRY_EPSILON && o4 > GEOMETRY_EPSILON));
  if (properCrossing) return 'crossing';

  const scale = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y), Math.hypot(d.x - c.x, d.y - c.y));
  const collinear = [o1, o2, o3, o4].every(v => Math.abs(v) <= GEOMETRY_EPSILON * scale);
  if (collinear) {
    const useX = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
    const p1 = useX ? [a.x, b.x].sort((x, y) => x - y) : [a.y, b.y].sort((x, y) => x - y);
    const p2 = useX ? [c.x, d.x].sort((x, y) => x - y) : [c.y, d.y].sort((x, y) => x - y);
    const overlap = Math.min(p1[1], p2[1]) - Math.max(p1[0], p2[0]);
    if (overlap > GEOMETRY_EPSILON) return 'overlap';
    if (Math.abs(overlap) <= GEOMETRY_EPSILON &&
        ([a, b].some(p => [c, d].some(q => samePoint(p, q))))) return 'endpoint';
    return 'none';
  }

  const endpoints = [
    { p: a, endpointOf: 'first' as const },
    { p: b, endpointOf: 'first' as const },
    { p: c, endpointOf: 'second' as const },
    { p: d, endpointOf: 'second' as const },
  ];
  const touches: { p: Point; endpointOf: 'first' | 'second' }[] = [];
  if (pointOnSegment(a, c, d)) touches.push(endpoints[0]);
  if (pointOnSegment(b, c, d)) touches.push(endpoints[1]);
  if (pointOnSegment(c, a, b)) touches.push(endpoints[2]);
  if (pointOnSegment(d, a, b)) touches.push(endpoints[3]);
  if (!touches.length) return 'none';
  if (touches.some(t => endpoints.some(e => e.endpointOf !== t.endpointOf && samePoint(e.p, t.p)))) return 'endpoint';
  return 'tee';
};

export const validateDxfDieline = (entities: any[]): DxfValidationResult => {
  const list=Array.isArray(entities)?entities:[];
  const errors:string[]=[],warnings:string[]=[];
  let totalLength=0,validCount=0;
  list.forEach((e:any,index:number)=>{
    const a=e?.start,b=e?.end;
    if(!a||!b||![a.x,a.y,b.x,b.y].every((n:any)=>typeof n==='number'&&Number.isFinite(n))){
      errors.push(`موجودیت ${index+1}: مختصات خط نامعتبر است.`);return;
    }
    const length=Math.hypot(b.x-a.x,b.y-a.y);
    if(length<1e-6){errors.push(`موجودیت ${index+1}: خط طول صفر دارد.`);return;}
    totalLength+=length;validCount++;
  });
  if(!list.length) errors.push('هیچ موجودیت هندسی در فایل یافت نشد.');
  if(list.length&&validCount===0) errors.push('هیچ خط معتبر قابل استفاده در نقشه وجود ندارد.');
  if(validCount>0&&totalLength<1) warnings.push('طول کل هندسه بسیار کم است؛ واحدهای فایل DXF را بررسی کنید.');
  return {valid:errors.length===0&&validCount>0,errors,warnings,entityCount:validCount,totalLength:Number(totalLength.toFixed(3))};
};

export interface ComprehensiveGeometryReport {
  passed: boolean;
  score: number;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  cutLength: number;
  creaseLength: number;
  isClosedLoop: boolean;
  hasSelfIntersection: boolean;
  collisionFlags: { dustFlap:boolean; tuck:boolean; autoBottom:boolean; snapLock:boolean };
  overallStatus:'PASSED'|'FAILED'|'WARNING';
  topology: { cutCutCrossings:number; cutCreaseCrossings:number; overlaps:number; teeContacts:number; boundsViolations:number; checkedPairs:number; truncated:boolean };
}

export interface DielineGeometryBounds { xMin:number; yMin:number; xMax:number; yMax:number }

export const runComprehensiveGeometryCheck = (
  cuts:string[]=[], creases:string[]=[], l=150, w=100, h=80, modelId='fefco-0201',
  tuck=20, dustFlap=15, totalW=500, totalH=300, sheetW=1000, sheetH=700, glueTab=35,
  geometryBounds?: DielineGeometryBounds
):ComprehensiveGeometryReport=>{
  const errors:string[]=[],warnings:string[]=[],suggestions:string[]=[];
  const allPaths=[...(Array.isArray(cuts)?cuts:[]),...(Array.isArray(creases)?creases:[])];
  const segments:Segment[]=[];
  let malformedCount=0, zeroLengthCount=0;
  let cutLength=0,creaseLength=0;
  const parsed=allPaths.map((path,index)=>parsePathSegments(path,index));
  parsed.forEach((p,index)=>{
    if(p.malformed||p.segments.length===0){malformedCount++;return;}
    for(const s of p.segments){
      const len=Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y);
      if(len<1e-7)zeroLengthCount++;
      else segments.push(s);
      if(index<cuts.length)cutLength+=len;else creaseLength+=len;
    }
  });
  if(!cuts.length)errors.push('مسیر برش در نقشه وجود ندارد.');
  if(!creases.length)warnings.push('هیچ مسیر خط‌تایی در نقشه وجود ندارد.');
  if(malformedCount)errors.push(`${malformedCount} مسیر SVG خالی، ناقص یا با فرمان پشتیبانی‌نشده وجود دارد.`);
  if(zeroLengthCount)warnings.push(`${zeroLengthCount} قطعه خط با طول صفر یا نزدیک به صفر شناسایی شد.`);
  if(![l,w,h,totalW,totalH,sheetW,sheetH,glueTab,tuck,dustFlap].every(Number.isFinite)||[l,w,h,totalW,totalH,sheetW,sheetH].some(n=>n<=0))
    errors.push('ابعاد محصول، نقشه یا ورق دارای مقدار نامعتبر هستند.');
  if(totalW>sheetW)errors.push(`عرض کل نقشه (${Math.round(totalW)}mm) از عرض ورق (${sheetW}mm) بیشتر است.`);
  if(totalH>sheetH)errors.push(`ارتفاع کل نقشه (${Math.round(totalH)}mm) از ارتفاع ورق (${sheetH}mm) بیشتر است.`);
  if(glueTab<15){warnings.push(`عرض لبه چسب (${Math.round(glueTab)}mm) کم است؛ مقدار نهایی را با استاندارد محصول و ماشین بررسی کنید.`);suggestions.push('عرض لبه چسب را بر اساس قالب و دستگاه واقعی تعیین کنید.');}
  let dustFlapCollision=false,tuckCollision=false;
  if(dustFlap>w*0.48){warnings.push('عرض زبانه گردگیر نسبت به عرض محصول زیاد است؛ احتمال تداخل را در حالت مونتاژ بررسی کنید.');dustFlapCollision=true;}
  if(tuck>h*0.6){warnings.push('عمق زبانه درب نسبت به ارتفاع محصول زیاد است؛ قفل‌شدن را در حالت مونتاژ بررسی کنید.');tuckCollision=true;}

  // Detect proper crossings between non-adjacent segments belonging to the same cut path.
  let hasSelfIntersection=false,checked=0,selfIntersectionDetail='';
  const byPath=new Map<number,{segments:Segment[];closed:boolean}>();
  segments.forEach(s=>{
    if(s.pathIndex<cuts.length){
      const record=byPath.get(s.pathIndex)||{segments:[],closed:parsed[s.pathIndex]?.closed??false};
      record.segments.push(s);
      byPath.set(s.pathIndex,record);
    }
  });
  outer: for(const [pathIndex,pathRecord] of byPath.entries()){
    const pathSegments=pathRecord.segments;
    for(let i=0;i<pathSegments.length;i++)for(let j=i+2;j<pathSegments.length;j++){
      // Only a genuinely closed path has a legitimate first/last adjacent pair.
      if(pathRecord.closed&&i===0&&j===pathSegments.length-1)continue;
      if(++checked>20000)break outer;
      if(intersects(pathSegments[i],pathSegments[j])){
        hasSelfIntersection=true;
        const a=pathSegments[i],b=pathSegments[j];
        selfIntersectionDetail=`مسیر برش ${pathIndex+1}، قطعات ${i+1}/${j+1}، نقاط [${a.a.x},${a.a.y}→${a.b.x},${a.b.y}] و [${b.a.x},${b.a.y}→${b.b.x},${b.b.y}]`;
        break outer;
      }
    }
  }
  if(checked>20000)warnings.push('برای جلوگیری از کندشدن پیش‌نمایش، بررسی تقاطع پس از ۲۰۰۰۰ جفت قطعه متوقف شد؛ این نقشه به بررسی کامل‌تر نیاز دارد.');
  if(hasSelfIntersection)errors.push(`تقاطع، تماس غیرمجاور یا هم‌پوشانی بین قطعات یک مسیر برش شناسایی شد؛ مسیر را بازبینی کنید. (${selfIntersectionDetail})`);


  // Cross-path topology audit: check cut/cut crossings and cut/crease crossings,
  // which the single-path self-intersection test above cannot see.
  let cutCutCrossings = 0, cutCreaseCrossings = 0, overlaps = 0, teeContacts = 0;
  let topologyChecked = 0, topologyTruncated = false, boundsViolations = 0;
  const topologyDetails: string[] = [];
  outerTopology: for (let i = 0; i < segments.length; i++) {
    const first = segments[i];
    const firstIsCut = first.pathIndex < cuts.length;
    for (let j = i + 1; j < segments.length; j++) {
      const second = segments[j];
      if (first.pathIndex === second.pathIndex) continue;
      const secondIsCut = second.pathIndex < cuts.length;
      if (!firstIsCut && !secondIsCut) continue;
      if (boxesDisjoint(first, second)) continue;
      topologyChecked++;
      if (topologyChecked > 50000) { topologyTruncated = true; break outerTopology; }

      const contact = classifySegmentContact(first, second);
      if (contact === 'none' || contact === 'endpoint') continue;
      const pairLabel = 'مسیرهای ' + (first.pathIndex < cuts.length ? 'برش ' : 'خط‌تا ') +
        (first.pathIndex < cuts.length ? first.pathIndex + 1 : first.pathIndex - cuts.length + 1) +
        ' و ' + (second.pathIndex < cuts.length ? 'برش ' : 'خط‌تا ') +
        (second.pathIndex < cuts.length ? second.pathIndex + 1 : second.pathIndex - cuts.length + 1);

      if (firstIsCut && secondIsCut) {
        if (contact === 'crossing' || contact === 'overlap') {
          if (contact === 'overlap') overlaps++;
          else cutCutCrossings++;
          if (topologyDetails.length < 8) topologyDetails.push(pairLabel + (contact === 'overlap' ? ': هم‌پوشانی قطعات برش' : ': تقاطع داخلی قطعات برش'));
        } else if (contact === 'tee') {
          teeContacts++;
        }
      } else {
        if (contact === 'crossing' || contact === 'overlap') {
          if (contact === 'overlap') overlaps++;
          else cutCreaseCrossings++;
          if (topologyDetails.length < 8) topologyDetails.push(pairLabel + (contact === 'overlap' ? ': هم‌پوشانی برش و خط‌تا' : ': عبور خط برش از خط‌تا'));
        } else if (contact === 'tee') {
          // A score ending at the blank perimeter, or a cut terminating on a score,
          // is a normal folded-carton junction and is intentionally not counted as an error.
        }
      }
    }
  }
  if (topologyTruncated) warnings.push('بررسی تقاطع بین مسیرهای مختلف پس از ۵۰۰۰۰ جفت نزدیک متوقف شد؛ نقشه برای بررسی کامل‌تر علامت‌گذاری شد.');
  if (cutCutCrossings) errors.push(cutCutCrossings + ' تقاطع داخلی بین مسیرهای برش جداگانه یافت شد.');
  if (cutCreaseCrossings) errors.push(cutCreaseCrossings + ' عبور نامعتبر بین خط‌برش و خط‌تا یافت شد.');
  if (overlaps) errors.push(overlaps + ' هم‌پوشانی خطی بین مسیرهای برش/خط‌تا یافت شد؛ ممکن است برش یا خط‌تا دوباره اجرا شود.');
  if (teeContacts) warnings.push(teeContacts + ' اتصال T بین قطعات برش دیده شد؛ نقاطی که شیار به فلپ کوتاه می‌رسد ممکن است عمدی باشد و نیاز به بازبینی تصویری دارد.');
  if (topologyDetails.length) suggestions.push('نمونه‌های برخورد: ' + topologyDetails.join('؛ '));

  if (geometryBounds) {
    const b = geometryBounds;
    if (![b.xMin, b.yMin, b.xMax, b.yMax].every(Number.isFinite) || b.xMax <= b.xMin || b.yMax <= b.yMin) {
      errors.push('محدودهٔ هندسی گزارش‌شده نامعتبر است.');
    } else {
      if (Math.abs((b.xMax - b.xMin) - totalW) > 0.1 || Math.abs((b.yMax - b.yMin) - totalH) > 0.1) {
        errors.push('ابعاد گسترده با محدودهٔ واقعی مسیرها یکسان نیست؛ حدود نقشه را اصلاح کنید.');
      }
      const validSegments = segments;
      for (const segment of validSegments) {
        for (const point of [segment.a, segment.b]) {
          if (point.x < b.xMin - 0.1 || point.x > b.xMax + 0.1 || point.y < b.yMin - 0.1 || point.y > b.yMax + 0.1) {
            boundsViolations++;
            break;
          }
        }
      }
      if (boundsViolations) errors.push(boundsViolations + ' قطعه خط از محدودهٔ اعلام‌شدهٔ گسترده خارج شده است.');
    }
  }

  const closedCutPaths=parsed.slice(0,cuts.length).filter(p=>!p.malformed&&p.segments.length>0);
  // Engines may legitimately represent a perimeter as several open SVG subpaths;
  // do not mark those individual fragments as an error or warning.
  const isClosedLoop=closedCutPaths.some(p=>p.closed);
  if(!segments.length)errors.push('هیچ قطعه خط معتبر برای محاسبه هندسه استخراج نشد.');

  const passed=errors.length===0;
  const score=Math.max(0,Math.min(100,100-errors.length*25-warnings.length*7));
  return {passed,score,errors,warnings,suggestions,cutLength:Math.round(cutLength),creaseLength:Math.round(creaseLength),
    isClosedLoop,hasSelfIntersection,collisionFlags:{dustFlap:dustFlapCollision,tuck:tuckCollision,autoBottom:false,snapLock:false},
    overallStatus:!passed?'FAILED':warnings.length?'WARNING':'PASSED',
    topology:{cutCutCrossings,cutCreaseCrossings,overlaps,teeContacts,boundsViolations,checkedPairs:topologyChecked,truncated:topologyTruncated}};
};

export const snapPath = (pathOrPoint:any,tolerance=1) => {
  if(typeof pathOrPoint==='string')return pathOrPoint;
  if(pathOrPoint&&typeof pathOrPoint.x==='number'&&typeof pathOrPoint.y==='number'&&Number.isFinite(tolerance)&&tolerance>0)
    return {x:Math.round(pathOrPoint.x/tolerance)*tolerance,y:Math.round(pathOrPoint.y/tolerance)*tolerance};
  return pathOrPoint;
};
