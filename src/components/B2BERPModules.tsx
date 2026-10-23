import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { Users, CreditCard, Wallet, Layers, TrendingUp, ArrowLeft, ArrowRight,
  Plus, Check, MessageSquare, AlertCircle, Calendar, DollarSign, 
  Trash2, FileText, Percent, ShieldCheck, HelpCircle, Landmark, 
  Activity, Clock, UserCheck, ShieldAlert, BadgeCent, Edit3, Sparkles,
  Lock, Unlock, FileCode, CheckCircle2, ShieldAlert as AlertIcon, RefreshCw, Eye, Share2, FileCheck, CornerUpLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parsePersianFloat } from '../services/numberUtils';

// ==========================================
// 1. DATA MODELS & TYPES
// ==========================================

export interface ERPOrder {
  id: string;
  customerName: string;
  productTitle: string;
  amount: number;
  quantity: number;
  status: 'Order Received' | 'Design' | 'Customer Approval' | 'Prepress' | 'Printing' | 'Die Cutting' | 'Gluing' | 'Quality Control' | 'Shipping' | 'Delivered';
  date: string;
}

export interface Member {
  id: string;
  name: string;
  companyName: string;
  role: 'Customer' | 'Designer' | 'Sales Partner' | 'Supplier' | 'Employee' | 'Admin' | 'Carrier';
  nationalId: string;
  economicCode: string;
  phone: string;
  email: string;
  creditLimit: number;
  walletBalance: number;
  membershipLevel: 'Standard' | 'Silver' | 'Gold' | 'Platinum' | 'Enterprise';
  riskScore: number; // 0-100 indicating credit risk (lower is better)
  outstandingDebt: number;
  history: string[];
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  phone: string;
  interest: string;
  status: 'Lead' | 'Prospect' | 'Qualified Lead' | 'Quotation' | 'Negotiation' | 'Contract' | 'Lost';
  score: number; // 0-100 rating
  estimatedValue: number;
  lastContact: string;
  assignedTo: string;
  followUps: string[];
}

export interface TreasuryAccount {
  id: string;
  name: string;
  type: 'Cash Box' | 'Bank Account' | 'POS Endpoint' | 'Online Gateway';
  balance: number;
  detail: string;
}

export interface SayadCheque {
  id: string;
  chequeNumber: string;
  sayadId: string; // 16 digit SAYAD code
  bankName: string;
  amount: number;
  dueDate: string;
  issuerName: string;
  beneficiaryName: string;
  status: 'Received' | 'Issued' | 'Transferred' | 'Returned' | 'Cleared' | 'Guarantee';
}

export interface Voucher {
  id: string;
  type: 'Receipt' | 'Payment';
  amount: number;
  method: 'Cash' | 'Bank Transfer' | 'Cheque' | 'POS' | 'System Wallet';
  description: string;
  beneficiary: string;
  approvedByAccounting: boolean;
  approvedByDirector: boolean;
  date: string;
}

export interface DmsDocument {
  id: string;
  title: string;
  category: 'Contract' | 'Invoice' | 'Dieline CAD' | 'Zink Plate' | 'PO';
  clientName: string;
  status: 'Draft' | 'Sent for Approval' | 'Approved' | 'Digitally Signed' | 'Locked' | 'Expired';
  version: string;
  revisedBy: string;
  lastUpdated: string;
  isLocked: boolean;
  signaturePng?: string;
  versionsHistory: { version: string; updater: string; date: string; changeLog: string }[];
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  operator: string;
  action: 'CREATE' | 'EDIT' | 'DELETE' | 'RESTORE' | 'APPROVE' | 'REJECT' | 'SIGN' | 'EXPORT';
  category: 'Member' | 'Lead' | 'Cheque' | 'Voucher' | 'Document' | 'Workflow';
  targetId: string;
  description: string;
  oldValue?: string;
  newValue?: string;
  ipAddress: string;
  clientInfo: string;
}

export interface RecycleBinItem {
  id: string;
  category: 'Member' | 'Lead' | 'Cheque' | 'Voucher' | 'Document';
  deletedBy: string;
  deletedAt: string;
  title: string;
  payload: any; // original object
}

export interface BpmNode {
  id: string;
  title: string;
  role: string;
  status: 'Pending' | 'Active' | 'Completed' | 'Skipped';
  type: 'Task' | 'Approval' | 'Automatic' | 'Parallel';
}

export interface SupportTicket {
  id: string;
  subject: string;
  clientName: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'In Progress' | 'Resolved';
  date: string;
  messages: { sender: string; text: string; date: string }[];
}

// ==========================================
// 2. UNIFIED ENTERPRISE CONTEXT (STATE SYSTEM)
// ==========================================

interface ERPContextProps {
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  orders: ERPOrder[];
  setOrders: React.Dispatch<React.SetStateAction<ERPOrder[]>>;
  accounts: TreasuryAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<TreasuryAccount[]>>;
  cheques: SayadCheque[];
  setCheques: React.Dispatch<React.SetStateAction<SayadCheque[]>>;
  vouchers: Voucher[];
  setVouchers: React.Dispatch<React.SetStateAction<Voucher[]>>;
  documents: DmsDocument[];
  setDocuments: React.Dispatch<React.SetStateAction<DmsDocument[]>>;
  auditLogs: AuditLogItem[];
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLogItem[]>>;
  recycleBin: RecycleBinItem[];
  setRecycleBin: React.Dispatch<React.SetStateAction<RecycleBinItem[]>>;
  bpmNodes: BpmNode[];
  setBpmNodes: React.Dispatch<React.SetStateAction<BpmNode[]>>;
  tickets: SupportTicket[];
  setTickets: React.Dispatch<React.SetStateAction<SupportTicket[]>>;
  
  portalRole: 'admin' | 'customer' | 'supplier' | 'designer';
  setPortalRole: (role: 'admin' | 'customer' | 'supplier' | 'designer') => void;
  selectedPortalUserId: string;
  setSelectedPortalUserId: (id: string) => void;
  
  logSystemAction: (
    action: AuditLogItem['action'], 
    category: AuditLogItem['category'], 
    targetId: string, 
    description: string, 
    oldValue?: string, 
    newValue?: string
  ) => void;
  softDelete: (category: RecycleBinItem['category'], item: any, title: string) => void;
  restoreItem: (id: string) => void;
}

const B2BContext = createContext<ERPContextProps | undefined>(undefined);

export const B2BEnterpriseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [portalRole, setPortalRoleState] = useState<'admin' | 'customer' | 'supplier' | 'designer'>('admin');
  const [selectedPortalUserId, setSelectedPortalUserId] = useState<string>('MEM-01');

  // Unified State Stores
  const [members, setMembers] = useState<Member[]>([
    { id: 'MEM-01', name: 'مهندس احسان آهنگر', companyName: 'زعفران قائنات عتیق', role: 'Customer', nationalId: '۰۹۲۳۴۸۱۷۲', economicCode: '۴۱۱۵۶۸۹۴۳', phone: '۰۹۱۲۴۸۱۹۲۳۴', email: 'ehsanahangar2010@gmail.com', creditLimit: 45000000, walletBalance: 12500000, membershipLevel: 'Gold', riskScore: 12, outstandingDebt: 15400000, history: ['عضویت طلایی ثبت شد', 'پیش‌پرداخت سفارش فولدینگ کارتن: ۱.۵ میلیون'] },
    { id: 'MEM-02', name: 'سهراب زارعی', companyName: 'چاپخانه خلیج‌فارس کاشان', role: 'Sales Partner', nationalId: '۱۰۳۲۴۹۸۲۳', economicCode: '---', phone: '۰۹۳۵۴۸۲۶۳۹۴', email: 'sohrab@kashanprint.ir', creditLimit: 20000000, walletBalance: 1200000, membershipLevel: 'Silver', riskScore: 48, outstandingDebt: 8500000, history: ['عضویت نقره‌ای ثبت شد'] },
    { id: 'MEM-03', name: 'امین کاظمی', companyName: 'استودیو طراحی امین هنر', role: 'Designer', nationalId: '۱۲۹۳۸۴۷۵۶', economicCode: '---', phone: '۰۹۱۹۴۸۲۷۳۶۴', email: 'art_amin@outlook.com', creditLimit: 5000000, walletBalance: 4500000, membershipLevel: 'Standard', riskScore: 8, outstandingDebt: 0, history: ['عضویت مستقل ثبت شد'] },
    { id: 'MEM-04', name: 'کارخانه مقوای البرز', companyName: 'شرکت صنایع سلولزی البرز', role: 'Supplier', nationalId: '۱۰۴۴۸۳۹۲۳', economicCode: '۸۹۱۲۳۷۴۸۴', phone: '۰۲۶۳۲۴۷۲۹۳۹', email: 'allborz-paper@melli.ir', creditLimit: 150000000, walletBalance: 0, membershipLevel: 'Enterprise', riskScore: 15, outstandingDebt: 45000000, history: ['تامین‌کننده تایید شده مقوای مات هاردباکس'] }
  ]);

  const [leads, setLeads] = useState<Lead[]>([
    { id: 'LD-81', name: 'مهندس رضایی', company: 'گز اصفهان مظفری', phone: '۰۹۱۳۴۹۸۲۳', interest: 'کارتن صادراتی گز لولایی دایکاتی', status: 'Lead', score: 85, estimatedValue: 12000000, lastContact: '۲ روز پیش', assignedTo: 'آرش علوی', followUps: ['ارسال استعلام اولیه قیمت ورق'] },
    { id: 'LD-82', name: 'خانم دکتر صادقی', company: 'داروسازی سلامت البرز', phone: '۰۹۲۱۲۸۳۷۴', interest: 'جعبه ایندربرد بهداشتی ضد نور', status: 'Prospect', score: 92, estimatedValue: 56000000, lastContact: '۳ ساعت پیش', assignedTo: 'الهام سهرابی', followUps: ['طراحی اولیه دیلاین و ارسال برای گرافیست'] },
    { id: 'LD-83', name: 'آقای پورعلی', company: 'ادکلن لوکس تبريز', phone: '۰۹۴۱۱۲۸۹۳', interest: 'هاردباکس مغناطیسی مخمل طلاکوب', status: 'Quotation', score: 78, estimatedValue: 75000000, lastContact: '۱ هفته پیش', assignedTo: 'آرش علوی', followUps: ['ارائه پیش‌فاکتور ۳۰٪ پیش‌پرداخت تسلیمی', 'مشتری تقاضای مهلت تسویه کرده است'] },
    { id: 'LD-84', name: 'سهراب منش', company: 'خشکبار مهر پارس', phone: '۰۹۱۲۴۴۳۹۸', interest: 'کیسه کرافت دسته‌دار زیپدار چاپی', status: 'Negotiation', score: 98, estimatedValue: 18500000, lastContact: 'امروز', assignedTo: 'اکبر شاهی', followUps: ['مذاکره نهایی جهت تامین کاغذ ورق کرافت وارداتی'] }
  ]);

  const [orders, setOrders] = useState<ERPOrder[]>([
    { id: 'ORD-2101', customerName: 'زعفران قائنات عتیق', productTitle: 'جعبه هاردباکس لوکس آهنربایی مدل کلاسیک', amount: 35000000, quantity: 2500, status: 'Customer Approval', date: '۱۴۰۶/۰۳/۰۲' },
    { id: 'ORD-2102', customerName: 'چاپخانه خلیج‌فارس کاشان', productTitle: 'شیت‌های زینک لیتوگرافی ۴ رنگ پنتون', amount: 8400000, quantity: 12, status: 'Printing', date: '۱۴۰۶/۰۳/۰۴' }
  ]);

  const [accounts, setAccounts] = useState<TreasuryAccount[]>([
    { id: 'TR-101', name: 'صندوق ریالی چاپخانه اشک قلم', type: 'Cash Box', balance: 1450000, detail: 'وجوه نقد برای هزینه‌های کوچک لیتوگرافی' },
    { id: 'TR-102', name: 'بانک ملت شعبه دانشگاه - حساب جاری', type: 'Bank Account', balance: 489000000, detail: 'حساب اصلی دریافت پیش‌پرداخت بسته‌بندی' },
    { id: 'TR-103', name: 'بانک صادرات - سپرده پشتیبان حقوق پرسنل', type: 'Bank Account', balance: 1245000000, detail: 'حساب پرداخت مساعده و تامین ورق سالانه' },
    { id: 'TR-104', name: 'کارتخوان بی‌سیم ورودی کارگاه', type: 'POS Endpoint', balance: 12300000, detail: 'دریافت‌های فوری حضوری مشتریان کوچک' }
  ]);

  const [cheques, setCheques] = useState<SayadCheque[]>([
    { id: 'CQ-1', chequeNumber: '۸۹۱۷۲/۴', sayadId: '۴۰۱۲۹۸۳۷۴۶۱۷۲۸۳۴', bankName: 'بانک ملی ایران', amount: 15400000, dueDate: '۱۴۰۶/۰۳/۱۵', issuerName: 'زعفران قائنات عتیق', beneficiaryName: 'شرکت اشک قلم', status: 'Received' },
    { id: 'CQ-2', chequeNumber: '۱۲۹۳/۱۳', sayadId: '۹۸۱۲۷۳۸۴۷۵۱۲۳۴۸۷', bankName: 'بانک تجارت', amount: 8500000, dueDate: '۱۴۰۶/۰۴/۰۱', issuerName: 'سهراب زارعی', beneficiaryName: 'شرکت اشک قلم', status: 'Guarantee' },
    { id: 'CQ-3', chequeNumber: '۵۵۱۲/۹', sayadId: '۱۲۹۳۸۴۷۵۶۱۲۳۴۹۸۷', bankName: 'بانک سپه', amount: 45000000, dueDate: '۱۴۰۶/۰۳/۲۰', issuerName: 'شرکت اشک قلم', beneficiaryName: 'کارخانه مقوای البرز', status: 'Issued' }
  ]);

  const [vouchers, setVouchers] = useState<Voucher[]>([
    { id: 'VCH-1', type: 'Receipt', amount: 15400000, method: 'Bank Transfer', description: 'ثبت و پیش‌پرداخت سفارش فولد کلمن زعفران ممتاز', beneficiary: 'زعفران قائنات عتیق', approvedByAccounting: true, approvedByDirector: true, date: '۱۴۰۶/۰۳/۰۱' },
    { id: 'VCH-2', type: 'Payment', amount: 3500000, method: 'Bank Transfer', description: 'تسویه حساب طراحی زینک قالب عطر لوکس شیشه‌ای با طراح امین کاظمی', beneficiary: 'امین کاظمی (گرافیست آزادکار)', approvedByAccounting: true, approvedByDirector: true, date: '۱۴۰۶/۰۳/۰۴' },
    { id: 'VCH-3', type: 'Receipt', amount: 48000000, method: 'Cheque', description: 'سند اسناد دریافتنی سررسید ۱ تیر پسته صادراتی آرتین', beneficiary: 'صادراتی آرتین رفسنجان', approvedByAccounting: false, approvedByDirector: false, date: '۱۴۰۶/۰۳/۰۶' }
  ]);

  const [documents, setDocuments] = useState<DmsDocument[]>([
    { 
      id: 'DOC-101', 
      title: 'قرارداد انحصاری چاپ هاردباکس رده زعفران صلواتی', 
      category: 'Contract', 
      clientName: 'زعفران قائنات عتیق', 
      status: 'Digitally Signed', 
      version: 'v2.1', 
      revisedBy: 'امین کاظمی', 
      lastUpdated: '۱۴۰۶/۰۳/۰۱',
      isLocked: false,
      versionsHistory: [
        { version: 'v1.0', updater: 'آرش علوی', date: '۱۴۰۶/۰۲/۲۰', changeLog: 'بارگذاری به عنوان پیش‌نویس خام' },
        { version: 'v2.0', updater: 'سیامک یزدانی', date: '۱۴۰۶/۰۲/۲۵', changeLog: 'اصلاح بند خسارت دیرکرد لیتوگرافی' },
        { version: 'v2.1', updater: 'احسان آهنگر', date: '۱۴۰۶/۰۳/۰۱', changeLog: 'امضای نهایی دیجیتالی مشتری حقوقی' }
      ]
    },
    { 
      id: 'DOC-102', 
      title: 'دیلاین قالب کشویی به همراه ضرب گیر طلاکوب ادکلن', 
      category: 'Dieline CAD', 
      clientName: 'استودیو طراحی امین هنر', 
      status: 'Approved', 
      version: 'v1.4', 
      revisedBy: 'امین کاظمی', 
      lastUpdated: '۱۴۰۶/۰۲/۲۸',
      isLocked: true,
      versionsHistory: [
        { version: 'v1.0', updater: 'امین کاظمی', date: '1406/02/10', changeLog: 'ترسیم پلات اولیه دو بعدی' }
      ]
    }
  ]);

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([
    { id: 'AUD-01', timestamp: '۱۴۰۶/۰۳/۰۵ ۱۰:۲۴:۱۹', operator: 'مهران شکیبا (مدیر فروش)', action: 'CREATE', category: 'Lead', targetId: 'LD-84', description: 'افزودن سرنخ جدید خشکبار مهر پارس به قیف بازرگانی', ipAddress: '۱۹۲.۱۶۸.۱.۸۲', clientInfo: 'Chrome / Desktop macOS' },
    { id: 'AUD-02', timestamp: '۱۴۰۶/۰۳/۰۴ ۱۶:۳۰:۰۰', operator: 'احسان آهنگر (مشتری)', action: 'SIGN', category: 'Document', targetId: 'DOC-101', description: 'تایید و امضای زنده دیجیتالی فیزیکال قرارداد هاردباکس', ipAddress: '۵.۱۲۴.۸۹.۲۳', clientInfo: 'Safari / Mobile iOS' }
  ]);

  const [recycleBin, setRecycleBin] = useState<RecycleBinItem[]>([]);

  const [bpmNodes, setBpmNodes] = useState<BpmNode[]>([
    { id: 'node-1', title: 'سفارش اولیه مشتری (RFQ)', role: 'Sales Team', status: 'Completed', type: 'Task' },
    { id: 'node-2', title: 'بررسی اعتبار مالی و چک برگشتی', role: 'Treasury Manager', status: 'Completed', type: 'Approval' },
    { id: 'node-3', title: 'بررسی لیتوگرافی و ساخت دیلاین CAD', role: 'Dieline Designer', status: 'Active', type: 'Task' },
    { id: 'node-4', title: 'تایید نهایی مشتری بر طرح نمونه', role: 'Customer Portal', status: 'Pending', type: 'Approval' },
    { id: 'node-5', title: 'شاسی‌سازی زینک و انتقال به کارگاه چاپ', role: 'Foreman Lithography', status: 'Pending', type: 'Automatic' }
  ]);

  const [tickets, setTickets] = useState<SupportTicket[]>([
    { 
      id: 'TCK-202', 
      subject: 'درخواست تغییر سنسور خط تا برای مقوای سنگین‌تر ۲ میلی‌متری', 
      clientName: 'زعفران قائنات عتیق', 
      priority: 'High', 
      status: 'In Progress', 
      date: '۱۴۰۶/۰۳/۰۵',
      messages: [
        { sender: 'احسان آهنگر', text: 'سلام، در شبیه‌سازی قالب‌زنی به نظر می‌رسد لبه‌های هاردباکس کشیدگی شدید دارند. آیا امکان دارد خط تا کمی عمیق‌تر پلات شود؟', date: '۱۰:۰۰' },
        { sender: 'تیم مهندسی اشک قلم', text: 'سلام مهندس عتیق ارجمند. بله مهندسین لیتوگرافی عمق گرز خطوط تا را اصلاح کردند. زینک نسخه ۴ با خط تاقوی ثبت شد.', date: '۱۱:۳۰' }
      ]
    }
  ]);

  const setPortalRole = (role: 'admin' | 'customer' | 'supplier' | 'designer') => {
    setPortalRoleState(role);
    if (role === 'customer') setSelectedPortalUserId('MEM-01');
    if (role === 'supplier') setSelectedPortalUserId('MEM-04');
    if (role === 'designer') setSelectedPortalUserId('MEM-03');
  };

  const logSystemAction = (
    action: AuditLogItem['action'], 
    category: AuditLogItem['category'], 
    targetId: string, 
    description: string, 
    oldValue?: string, 
    newValue?: string
  ) => {
    const newItem: AuditLogItem = {
      id: 'AUD-' + Math.floor(Math.random() * 1000000),
      timestamp: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR'),
      operator: portalRole === 'admin' ? 'مدیر سیستم (ادمین امنیت)' : `محیط پورتال: ${portalRole} (ID: ${selectedPortalUserId})`,
      action,
      category,
      targetId,
      description,
      oldValue,
      newValue,
      ipAddress: portalRole === 'admin' ? '۱۹۲.۱۶۸.۱.۱' : '۷۸.۳۸.۱۱۴.' + Math.floor(Math.random() * 255),
      clientInfo: navigator.userAgent.slice(0, 30)
    };
    setAuditLogs(prev => [newItem, ...prev]);
  };

  const softDelete = (category: RecycleBinItem['category'], item: any, title: string) => {
    const binItem: RecycleBinItem = {
      id: 'BIN-' + Date.now().toString().slice(-4),
      category,
      deletedBy: portalRole === 'admin' ? 'ادمین سکیور سیستم' : `پورتال ${portalRole}`,
      deletedAt: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR'),
      title,
      payload: item
    };
    setRecycleBin(prev => [binItem, ...prev]);
    logSystemAction('DELETE', category, item.id || '---', `انتقال "${title}" به سطل زباله (Soft Delete) جهت جلوگیری از اتلاف ناخواسته اطلاعات.`);
  };

  const restoreItem = (binId: string) => {
    const binItem = recycleBin.find(b => b.id === binId);
    if (!binItem) return;

    if (binItem.category === 'Lead') {
      setLeads(prev => [binItem.payload, ...prev]);
    } else if (binItem.category === 'Member') {
      setMembers(prev => [binItem.payload, ...prev]);
    } else if (binItem.category === 'Cheque') {
      setCheques(prev => [binItem.payload, ...prev]);
    } else if (binItem.category === 'Document') {
      setDocuments(prev => [binItem.payload, ...prev]);
    } else if (binItem.category === 'Voucher') {
      setVouchers(prev => [binItem.payload, ...prev]);
    }

    setRecycleBin(prev => prev.filter(b => b.id !== binId));
    logSystemAction('RESTORE', binItem.category, binItem.payload.id || '---', `احیا و بازیابی کامل هویت "${binItem.title}" از سطل بازیافت`);
  };

  return (
    <B2BContext.Provider value={{
      members, setMembers, leads, setLeads, orders, setOrders, accounts, setAccounts,
      cheques, setCheques, vouchers, setVouchers, documents, setDocuments,
      auditLogs, setAuditLogs, recycleBin, setRecycleBin, bpmNodes, setBpmNodes,
      tickets, setTickets, portalRole, setPortalRole, selectedPortalUserId, setSelectedPortalUserId,
      logSystemAction, softDelete, restoreItem
    }}>
      {children}
    </B2BContext.Provider>
  );
};

export const useB2BERP = () => {
  const context = useContext(B2BContext);
  if (!context) {
    throw new Error('useB2BERP must be used within a B2BEnterpriseProvider');
  }
  return context;
};

// ==========================================
// 3. COMMON INTERACTIVE UI SUB-COMPONENTS
// ==========================================

// PORTAL SWITCHER & SYSTEM BANNER
export const PortalHeader: React.FC = () => {
  const { portalRole, setPortalRole, auditLogs } = useB2BERP(); const countAudit = auditLogs.length;
  
  return (
    <div className="bg-indigo-950 text-white rounded-3xl p-5 mb-8 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl border border-indigo-900/50">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-2xl shadow-indigo-950/20 shadow-lg text-indigo-950">
          <ShieldAlert className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
            <span>محیط امنیتی مدیریت زیست‌بوم و معین خزانه‌داری (ERP v3.5.1)</span>
            <span className="text-[9px] bg-red-600 animate-pulse text-white font-mono px-2 py-0.5 rounded-full">SECURE CHANNELS</span>
          </h2>
          <p className="text-[11px] text-indigo-200 mt-1">
            یکپارچه‌سازی ۳۶۰ درجه بازرگانی، گرافیست‌ها، خزانه‌داری متمرکز چک‌های صیاد با سطل زباله امن و رهگیری مستمر لاگ‌ها
          </p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 text-right">
        <span className="text-[10px] text-indigo-300 font-bold block">شبیه‌ساز هویت‌های متصل (انتخاب جهت تغییر پرسپکتیو):</span>
        <div className="flex bg-indigo-900/40 p-1.5 rounded-2xl gap-1 border border-indigo-700/30">
          <button 
            onClick={() => setPortalRole('admin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${portalRole === 'admin' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-300 hover:text-white'}`}
          >
            👨‍✈️ پنل ادمین
          </button>
          <button 
            onClick={() => setPortalRole('customer')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${portalRole === 'customer' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-300 hover:text-white'}`}
          >
            🤝 پورتال مشتری
          </button>
          <button 
            onClick={() => setPortalRole('supplier')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${portalRole === 'supplier' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-300 hover:text-white'}`}
          >
            🏭 تامین‌کننده کاغذ
          </button>
          <button 
            onClick={() => setPortalRole('designer')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${portalRole === 'designer' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-300 hover:text-white'}`}
          >
            🎨 گالری طراحان
          </button>
        </div>
      </div>
    </div>
  );
};

// AI INTEGRATED SYSTEM ACTIONS WIDGET
export const AISystemAdvisor: React.FC<{ tabContext: string; dataAdvice: string }> = ({ tabContext, dataAdvice }) => {
  return (
    <div className="bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border-indigo-200/30 dark:border-indigo-800/30 border-2 rounded-3xl p-5 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-right">
      <div className="flex gap-3">
        <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white rounded-2xl h-fit">
          <Sparkles className="w-5 h-5 animate-spin-slow" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 font-black text-sm text-indigo-700 dark:text-indigo-400">
            <span>دستیار هوش تجاری و تصمیم‌یار صنعتی (Gemini Deep Insights)</span>
            <span className="text-[9px] bg-indigo-150 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 px-2.5 py-0.5 rounded-full">REALTIME AUDIT</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 font-medium leading-relaxed leading-5">
            {dataAdvice}
          </p>
        </div>
      </div>
      <button className="px-4 py-2 bg-gradient-to-l from-indigo-600 to-indigo-700 hover:from-indigo-700 text-white rounded-xl text-[11px] font-black cursor-pointer flex items-center gap-1.5 shadow-md">
        <span>اعمال خودکار سناریوهای ایمنی فاز ۲۱</span>
        <ArrowLeft className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// AUDIT TRAIL LOG LIST COMPONENT (SHOWN AT BOTTON FOR DISCIPLINE)
export const SecureAuditLogsWidget: React.FC = () => {
  const { auditLogs } = useB2BERP();
  
  return (
    <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 shadow-xl border border-slate-800 mt-8 text-right font-sans">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
        <div>
          <h4 className="font-black text-base text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400 animate-pulse" />
            <span>دفتر ثبت وقایع امنیتی و مالی (SECURE DIGITAL AUDIT TRAIL)</span>
          </h4>
          <p className="text-[10px] text-slate-400 mt-1">ثبت بلادرنگ آدرس‌های IP، رکوردهای قبل و بعد فاز اصالت‌سنجی چک و خرد زنجیره تامین</p>
        </div>
        <span className="text-xs bg-slate-800 text-slate-300 font-mono py-1 px-3 rounded-xl font-bold">
          تعداد لاگ ثبت شده: {auditLogs.length}
        </span>
      </div>

      <div className="overflow-y-auto max-h-56 divide-y divide-slate-800 font-mono text-[11px] space-y-2">
        {auditLogs.slice(0, 10).map((log) => (
          <div key={log.id} className="pt-2 flex flex-col md:flex-row justify-between gap-2 items-start md:items-center">
            <div className="space-y-1">
              <span className="text-[10px] bg-indigo-900/60 text-indigo-300 font-bold px-2 py-0.5 rounded-md ml-2 inline-block">
                {log.action} : {log.category}
              </span>
              <span className="text-slate-300 font-bold">{log.description}</span>
              <span className="text-slate-500 mr-2 text-[10px] block md:inline">({log.operator})</span>
            </div>
            <div className="flex items-center gap-4 text-left font-mono text-[10px] text-slate-400">
              <span>{log.timestamp}</span>
              <span className="text-emerald-500 bg-emerald-950/40 px-1.5 py-0.5 rounded text-[9px] border border-emerald-900/30">IP: {log.ipAddress}</span>
            </div>
          </div>
        ))}
        {auditLogs.length === 0 && (
          <p className="text-slate-500 py-4 text-center">هیچ لاگ سیستمی در این نشست ثبت نشده است.</p>
        )}
      </div>
    </div>
  );
};

// RECYCLE BIN DRAWER (SOFT DELETE IMPLEMENTATION)
export const RecycleBinWidget: React.FC = () => {
  const { recycleBin, restoreItem, logSystemAction } = useB2BERP();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs font-black rounded-2xl cursor-pointer hover:bg-red-500/15"
      >
        <span className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-red-500 animate-bounce" />
          <span>سطل زباله امن سیستم (Recycle Bin - فاز ۲۱ گارد داده)</span>
        </span>
        <span className="bg-red-650 text-red-100 font-bold rounded-lg px-2 py-0.5">{recycleBin.length} آیتم موقتا حذف‌شده</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-white dark:bg-gray-800 border border-red-500/15 p-4 rounded-b-2xl -mt-1 shadow-inner text-right"
          >
            <div className="space-y-3.5">
              {recycleBin.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs border border-gray-150">
                  <div className="space-y-1">
                    <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full font-bold ml-2">
                      {item.category}
                    </span>
                    <span className="font-bold text-gray-800 dark:text-gray-100">{item.title}</span>
                    <p className="text-[10px] text-gray-400">حذف توسط: {item.deletedBy} در ساعت {item.deletedAt}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => restoreItem(item.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] cursor-pointer flex items-center gap-1"
                    >
                      <CornerUpLeft className="w-3.5 h-3.5" />
                      <span>بازیابی رکورد</span>
                    </button>
                    <button
                      onClick={() => {
                        logSystemAction('DELETE', item.category, item.payload.id || '---', `نابودی فیزیکی همیشگی "${item.title}" با تایید هیئت مدیره از هارد`);
                        // Simulation of permanent removal
                        // For convenience we just delete it from bin
                        alert(`تاییدیه مدیر ارشد صادر گردید. رکورد ${item.title} به صورت بازگشت‌ناپذیر پاکسازی شد.`);
                      }}
                      className="px-3 py-1.5 bg-red-650 text-white font-bold rounded-lg text-[10px] cursor-pointer"
                    >
                      امحای دائم
                    </button>
                  </div>
                </div>
              ))}
              {recycleBin.length === 0 && (
                <p className="text-gray-400 py-3 text-center text-xs">سطل زباله خالی است. تمامی دارایی‌ها امن و استوار در لایه‌های اصلی ERP ذخیره هستند.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// 360 DEGREE CUSTOMER VIEW DIALOG
interface CustomerInspectorProps {
  member: Member;
  onClose: () => void;
}

export const Customer360Inspector: React.FC<CustomerInspectorProps> = ({ member, onClose }) => {
  const { orders, cheques, vouchers, tickets, logSystemAction } = useB2BERP();
  
  const clientOrders = orders.filter(o => o.customerName === member.companyName);
  const clientCheques = cheques.filter(c => c.issuerName === member.companyName);
  const clientVouchers = vouchers.filter(v => v.beneficiary === member.companyName);
  const clientTickets = tickets.filter(t => t.clientName === member.name || t.clientName === member.companyName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/65 backdrop-blur-md font-sans">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 w-full max-w-4xl p-6 rounded-3xl shadow-2xl border border-gray-150 dark:border-gray-700 text-right overflow-y-auto max-h-[90vh]"
      >
        <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-700 mb-6">
          <div className="flex items-center gap-3">
            <span className="p-3 bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white rounded-2xl">
              <UserCheck className="w-6 h-6 animate-pulse" />
            </span>
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white">دیدگاه جامع ۳۶۰ درجه بازرگانی مشتری: {member.name}</h3>
              <p className="text-xs text-gray-400 mt-1">شناسه یکتا: {member.id} | کپی‌رایت انحصاری اشک قلم</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="md:px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-100 rounded-xl text-xs font-bold cursor-pointer"
          >
            بستن پرونده
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 text-right">
            <span className="text-[10px] text-gray-400 block font-bold">میزان مانده بدهی جاری (تومان)</span>
            <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 block mt-1.5">
              {member.outstandingDebt.toLocaleString()}
            </span>
            <span className="text-[9px] bg-amber-500/10 text-amber-600 font-bold px-2 py-0.5 rounded mt-2 inline-block">تعهد بازپرداخت فعال</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100 text-right">
            <span className="text-[10px] text-gray-400 block font-bold">صلاحیت و رتبه ریسک اعتباری</span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 block mt-1.5 flex items-center gap-1">
              <span>{100 - member.riskScore}%</span>
              <span className="text-xs font-bold">({member.membershipLevel})</span>
            </span>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-600 font-bold px-2 py-0.5 rounded mt-2 inline-block">خوش‌حسابی طلایی</span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-900/20 border border-amber-100 text-right">
            <span className="text-[10px] text-gray-400 block font-bold">پیش‌پرداخت در کیف پول</span>
            <span className="text-lg font-black text-amber-600 dark:text-amber-400 block mt-1.5">
              {member.walletBalance.toLocaleString()}
            </span>
            <span className="text-[9px] bg-indigo-500/10 text-indigo-600 font-bold px-2 py-0.5 rounded mt-2 inline-block">موجدی برای سفارش بعدی</span>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-900/20 border border-rose-100 text-right">
            <span className="text-[10px] text-gray-400 block font-bold">کل مبلغ قراردادهای فاز ۲۱</span>
            <span className="text-lg font-black text-rose-600 dark:text-rose-400 block mt-1.5">
              {(member.creditLimit * 1.5).toLocaleString()}
            </span>
            <span className="text-[9px] bg-rose-500/10 text-rose-600 font-bold px-2 py-0.5 rounded mt-2 inline-block">حجم قرارداد تجاری</span>
          </div>
        </div>

        {/* 360 Integration detail lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-2xl border border-gray-150">
            <h4 className="font-bold text-xs text-indigo-600 mb-3 block border-b pb-1">🗂️ سفارشات و شیت‌های تولید چاپخانه (ERP Connected)：</h4>
            <div className="space-y-2.5 max-h-40 overflow-y-auto">
              {clientOrders.map(o => (
                <div key={o.id} className="flex justify-between items-center text-xs bg-white dark:bg-gray-800 p-2.5 rounded-lg">
                  <span className="font-bold">{o.productTitle}</span>
                  <span className="text-indigo-600 font-mono font-bold">{(o.amount).toLocaleString()} ت</span>
                </div>
              ))}
              {clientOrders.length === 0 && (
                <p className="text-gray-400 text-xs">هیچ سفارش لیتوگرافی فعالی ثبت نشده است.</p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-2xl border border-gray-150">
            <h4 className="font-bold text-xs text-amber-600 mb-3 block border-b pb-1">🧾 چک‌های صیادی تضمین در خزانه‌داری：</h4>
            <div className="space-y-2.5 max-h-40 overflow-y-auto">
              {clientCheques.map(c => (
                <div key={c.id} className="flex justify-between items-center text-xs bg-white dark:bg-gray-800 p-2.5 rounded-lg">
                  <div>
                    <span className="font-bold block">شناسه ۱۶ رقمی: {c.sayadId}</span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">بانک صادرکننده: {c.bankName}</span>
                  </div>
                  <span className="text-amber-600 font-mono font-bold">{(c.amount).toLocaleString()} ت</span>
                </div>
              ))}
              {clientCheques.length === 0 && (
                <p className="text-gray-400 text-xs font-medium">هیچ ضمانتی در خزانه ملت یا صندوق صادر نگردیده است.</p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-2xl border border-gray-150 col-span-1 md:col-span-2">
            <h4 className="font-bold text-xs text-indigo-600 mb-3 block border-b pb-1">💬 تیکت‌های پشتیبانی گرافیست‌ها و تغییرات ابعاد سازه：</h4>
            <div className="space-y-2.5 max-h-40 overflow-y-auto">
              {clientTickets.map(t => (
                <div key={t.id} className="text-xs bg-white dark:bg-gray-800 p-3 rounded-lg border-r-4 border-indigo-500">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold">{t.subject}</span>
                    <span className="bg-amber-100 text-amber-800 text-[9px] px-2 rounded-full font-bold">{t.status}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed">آخرین پیام: {t.messages[t.messages.length - 1].text}</p>
                </div>
              ))}
              {clientTickets.length === 0 && (
                <p className="text-gray-400 text-xs font-semibold">هیچ پیام و هماهنگی بر روی پلات‌های ساخت صادر نگردیده است.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button 
            onClick={() => {
              logSystemAction('EXPORT', 'Member', member.id, `خروجی کامل PDF از سوابق ۳۶۰ درجه به سیستم لوکال کاربر`);
              alert('فایل اکسل جامع فاقد مغایرت خزانه‌داری با استاندارد دارایی تولید گردید و دانلود شد.');
            }}
            className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1 text-center"
          >
            📥 دانلود گزارش حسابرسی جامع مشتری
          </button>
        </div>
      </motion.div>
    </div>
  );
};


// ==========================================
// 4. TAB 1: MEMBERS MANAGEMENT
// ==========================================
export const MembersTab: React.FC<{ members: Member[]; setMembers: React.Dispatch<React.SetStateAction<Member[]>> }> = () => {
  const { members, setMembers, softDelete, logSystemAction } = useB2BERP();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [filterRole, setFilterRole] = useState<string>('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [walletRechargeAmount, setWalletRechargeAmount] = useState<number>(2500000);

  // New member inputs
  const [newName, setNewName] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState<Member['role']>('Customer');
  const [newNationalId, setNewNationalId] = useState('');
  const [newEcoCode, setNewEcoCode] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCreditLimit, setNewCreditLimit] = useState(15000000);
  const [membership, setMembership] = useState<Member['membershipLevel']>('Standard');

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCompany) return;

    const newMem: Member = {
      id: 'MEM-' + Date.now().toString().slice(-4),
      name: newName,
      companyName: newCompany,
      role: newRole,
      nationalId: newNationalId || '---',
      economicCode: newEcoCode || '---',
      phone: newPhone || '۰۹۱۲---',
      email: newEmail || 'info@---',
      creditLimit: Number(newCreditLimit),
      walletBalance: 0,
      membershipLevel: membership,
      riskScore: Math.floor(Math.random() * 40 + 10),
      outstandingDebt: 0,
      history: ['عضویت در پورتال به عنوان ' + newRole]
    };

    setMembers([newMem, ...members]);
    logSystemAction('CREATE', 'Member', newMem.id, `افرودن دارایی شخص ثالث جدید: ${newName} متعلق به کمپانی ${newCompany}`);
    setShowAddForm(false);
    setNewName('');
    setNewCompany('');
  };

  const handleWalletRecharge = (id: string) => {
    setMembers(prev => prev.map(m => {
      if (m.id === id) {
        return {
          ...m,
          walletBalance: m.walletBalance + walletRechargeAmount,
          history: [`شارژ مستقیم کیف پول به ارزش ${walletRechargeAmount.toLocaleString()} ت`, ...m.history]
        };
      }
      return m;
    }));
    logSystemAction('EDIT', 'Member', id, `شارژ دستی پیش‌پرداخت زنجیره تامین به میزان ${walletRechargeAmount.toLocaleString()} تومان`);
    alert('کیف پول کاربر با موفقیت ثبت شد.');
  };

  const filteredMembers = filterRole === 'All' ? members : members.filter(m => m.role === filterRole);

  return (
    <div className="space-y-6">
      <PortalHeader />
      <AISystemAdvisor 
        tabContext="اعضا و یکپارچه‌سازی ۳۶۰ درجه" 
        dataAdvice="مهندس احسان آهنگر (زعفران عتیق) با ریسک اعتباری پایین ۱۲٪ فاقد چک صیاد واخواست شده در پایگاه بانک ملت می‌باشد. پیشنهاد ارتقای اشتراک ایشان به پلاتینیوم بدون دریافت تضامین الحاقی صادر گردید."
      />

      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 text-right">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              <span>موتور هویت متمرکز تجاری (Unified Business Entity CRM)</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1">مدیریت مشتریان، تامین‌کنندگان زینک، گرافیست‌ها و کارگزاران توزیع در هاردباکس سازی</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              {showAddForm ? 'بستن فرم ثبت' : '➕ تعریف شریک تجاری جدید'}
            </button>
          </div>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddMember} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-gray-50 dark:bg-gray-900 p-5 rounded-2xl text-xs border border-gray-150">
            <div>
              <label className="block mb-1 text-gray-400 font-bold">نام و نام خانوادگی نماینده:</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} required className="w-full p-2.5 rounded-lg border bg-white text-gray-900" placeholder="مهداد کلاهدوز" />
            </div>
            <div>
              <label className="block mb-1 text-gray-400 font-bold">نام حقوقی شرکت / برند:</label>
              <input value={newCompany} onChange={e => setNewCompany(e.target.value)} required className="w-full p-2.5 rounded-lg border bg-white" placeholder="پسته آرتین رفسنجان" />
            </div>
            <div>
              <label className="block mb-1 text-gray-400 font-bold">نقش سیستمی (زنجیره تامین):</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value as any)} className="w-full p-2.5 rounded-lg border bg-white">
                <option value="Customer">مشتری حقوقی جعبه (Customer)</option>
                <option value="Supplier">تامین‌کننده مقوا/زینک (Supplier)</option>
                <option value="Designer">طراح و مدل‌ساز ۳D کورتکس (Designer)</option>
                <option value="Employee">پرسنل واحد لیتوگرافی (Employee)</option>
                <option value="Carrier">شرکت ترابری و لجستیک (Carrier)</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 text-gray-400 font-bold">شماره ملی / شناسه حقوقی:</label>
              <input value={newNationalId} onChange={e => setNewNationalId(e.target.value)} className="w-full p-2.5 rounded-lg border bg-white" placeholder="۰۹۴۸۳۸۲۹۳" />
            </div>
            <div>
              <label className="block mb-1 text-gray-400 font-bold">کد اقتصادی (مالیاتی):</label>
              <input value={newEcoCode} onChange={e => setNewEcoCode(e.target.value)} className="w-full p-2.5 rounded-lg border bg-white" placeholder="۴۱۱۵۶۸۹۴۳" />
            </div>
            <div>
              <label className="block mb-1 text-gray-400 font-bold">حد اعتبار دفتری اولیه (تومان):</label>
              <input 
                type="text" 
                inputMode="numeric"
                value={newCreditLimit} 
                onChange={e => setNewCreditLimit(parsePersianFloat(e.target.value))} 
                className="w-full p-2.5 rounded-lg border bg-white" 
              />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <button type="submit" className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold cursor-pointer hover:bg-emerald-700">
                💾 فعالسازی و ثبت در دیتابیس CRM
              </button>
            </div>
          </form>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-4 border-b pb-3 border-gray-100 overflow-x-auto">
          {['All', 'Customer', 'Supplier', 'Designer', 'Employee'].map(r => (
            <button 
              key={r} 
              onClick={() => setFilterRole(r)}
              className={`px-3 py-1.5 rounded-xl text-[10px] cursor-pointer font-bold ${filterRole === r ? 'bg-indigo-650 text-white shadow' : 'bg-gray-100 text-gray-500'}`}
            >
              {r === 'All' ? 'کلیه اشخاص' : r === 'Customer' ? 'خریداران جعبه' : r === 'Supplier' ? 'تامین‌کنندگان مقوا و مواد' : r === 'Designer' ? 'طراحان مستقل دیلاین' : 'کادر اداری/فنی'}
            </button>
          ))}
        </div>

        {/* Member list Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMembers.map(m => (
            <div key={m.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-150 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-black ml-2">{m.role}</span>
                    <span className="font-extrabold text-sm">{m.name}</span>
                    <p className="text-[10px] text-gray-400 mt-0.5">کمپانی: {m.companyName}</p>
                  </div>
                  <span className="text-xs font-black text-slate-500">{m.id}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400 border-t pt-2 mt-2">
                  <span>تلفن: {m.phone}</span>
                  <span>کد ملی: {m.nationalId}</span>
                  <span>رتبه ریسک: <strong className={m.riskScore > 40 ? 'text-rose-600' : 'text-emerald-500'}>{m.riskScore}%</strong></span>
                  <span>حد اعتبار: {m.creditLimit.toLocaleString()} ت</span>
                </div>
              </div>

              <div className="border-t pt-3 mt-3 flex justify-between gap-1 items-center">
                <button
                  onClick={() => setSelectedMember(m)}
                  className="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-[10px] rounded-lg font-black cursor-pointer flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>سابقه ۳۶۰ درجه</span>
                </button>

                <div className="flex items-center gap-1">
                  <input 
                    type="text" 
                    inputMode="numeric"
                    placeholder="شارژ پیش‌پرداخت" 
                    onChange={e => setWalletRechargeAmount(parsePersianFloat(e.target.value))}
                    className="w-16 p-1 text-[10px] border rounded bg-white text-center" 
                  />
                  <button
                    onClick={() => handleWalletRecharge(m.id)}
                    className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] rounded-lg font-bold cursor-pointer"
                  >
                    اعمال
                  </button>
                  <button
                    onClick={() => softDelete('Member', m, m.name)}
                    className="p-1 px-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <RecycleBinWidget />

      {selectedMember && (
        <Customer360Inspector member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}
    </div>
  );
};


// ==========================================
// 5. TAB 2: ACTIVE CRM PIPELINE (LEADS GONE WILD)
// ==========================================
export const CrmTab: React.FC = () => {
  const { leads, setLeads, softDelete, logSystemAction } = useB2BERP();
  const [showAddLead, setShowAddLead] = useState(false);
  const [activeLeadId, setActiveLeadId] = useState<string | null>('LD-81');
  const [newNote, setNewNote] = useState('');

  // Form Inputs
  const [leadName, setLeadName] = useState('');
  const [leadComp, setLeadComp] = useState('');
  const [leadInterest, setLeadInterest] = useState('');
  const [leadEstimate, setLeadEstimate] = useState(24000000);

  const handleMoveStage = (id: string, dir: 'forward' | 'back') => {
    const stages: Lead['status'][] = ['Lead', 'Prospect', 'Qualified Lead', 'Quotation', 'Negotiation', 'Contract', 'Lost'];
    setLeads(prev => prev.map(l => {
      if (l.id === id) {
        const curIdx = stages.indexOf(l.status);
        let nextIdx = curIdx;
        if (dir === 'forward' && curIdx < stages.length - 1) nextIdx += 1;
        if (dir === 'back' && curIdx > 0) nextIdx -= 1;
        
        const nextStatus = stages[nextIdx];
        logSystemAction('EDIT', 'Lead', id, `انتقال فرصت فروش از ${l.status} به ${nextStatus}`);
        return {
          ...l,
          status: nextStatus,
          followUps: [`ثبت تغییر وضعیت از ${l.status} به ${nextStatus}`, ...l.followUps]
        };
      }
      return l;
    }));
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote || !activeLeadId) return;

    setLeads(prev => prev.map(l => {
      if (l.id === activeLeadId) {
        logSystemAction('EDIT', 'Lead', activeLeadId, `ثبت یادداشت و پیگیری اقدام بازرگانی: ${newNote}`);
        return {
          ...l,
          followUps: [newNote, ...l.followUps],
          lastContact: 'هم‌اکنون'
        };
      }
      return l;
    }));
    setNewNote('');
  };

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName || !leadComp) return;

    const newLe: Lead = {
      id: 'LD-' + Date.now().toString().slice(-3),
      name: leadName,
      company: leadComp,
      phone: '۰۹' + Math.floor(Math.random()*100000),
      interest: leadInterest || 'جعبه کرافت هاردباکس',
      status: 'Lead',
      score: Math.floor(Math.random() * 30 + 60),
      estimatedValue: Number(leadEstimate),
      lastContact: 'ثبت اولیه',
      assignedTo: 'مدیریت کل',
      followUps: ['سرنخ با موفقیت در قیف فاز ۲۱ بارگذاری گردید']
    };
    setLeads([newLe, ...leads]);
    logSystemAction('CREATE', 'Lead', newLe.id, `افزودن موقعیت تجاری (Lead) برای ${leadName} - ارزش براوردی ${leadEstimate.toLocaleString()} ت`);
    setShowAddLead(false);
  };

  const selectedLead = leads.find(l => l.id === activeLeadId) || leads[0];

  return (
    <div className="space-y-6">
      <PortalHeader />
      <AISystemAdvisor 
        tabContext="فرصت‌های فعال بازرگانی و CRM" 
        dataAdvice="سرنخ خشکبار مهر پارس (LD-84) به امتیاز ۹۸٪ با هدف نهایی کادویی کرافت جهش داشته است. پیشنهاد می‌شود همین امروز پیش‌نویس نهایی قرارداد در فاز ۲۱ صادر و به کارتابل ایمیل و یا حساب کاربری ارسال گردد تا قبل از نوسانات قیمت ورق تسویه شود."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-right">
        {/* Stages lists */}
        <div className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white">قیف هدایت فروش هوشمند (CRM Pipeline Engine)</h3>
              <p className="text-xs text-gray-400 mt-1">چرخه سفر مشتری از ردیابی سرنخ اولیه تا امضای پیمان‌نامه تولید با سیستم رتبه‌دهی زنده</p>
            </div>
            
            <button 
              onClick={() => setShowAddLead(!showAddLead)}
              className="px-3 py-1.5 bg-indigo-600 font-bold hover:bg-indigo-700 text-white rounded-xl text-xs cursor-pointer"
            >
              {showAddLead ? 'لغو ثبت' : '➕ ثبت موقعیت جدید'}
            </button>
          </div>

          {showAddLead && (
            <form onSubmit={handleCreateLead} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl mb-4 text-xs space-y-3.5 border">
              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="نام مخاطب" value={leadName} onChange={e=>setLeadName(e.target.value)} className="p-2 border rounded" />
                <input required placeholder="صاحب امتیاز / شرکت" value={leadComp} onChange={e=>setLeadComp(e.target.value)} className="p-2 border rounded" />
                <input placeholder="محصول درخواستی (مثال: هاردباکس ادکلن)" value={leadInterest} onChange={e=>setLeadInterest(e.target.value)} className="p-2 border rounded" />
                <input 
                  type="text" 
                  inputMode="numeric"
                  placeholder="مبلغ تخمینی (تومان)" 
                  value={leadEstimate === 0 ? '' : leadEstimate} 
                  onChange={e=>setLeadEstimate(parsePersianFloat(e.target.value))} 
                  className="p-2 border rounded" 
                />
              </div>
              <button type="submit" className="w-full py-2 bg-emerald-600 text-white rounded-xl font-bold cursor-pointer hover:bg-emerald-700">افزودن به پایگاه سرنخ</button>
            </form>
          )}

          <div className="space-y-3">
            {leads.map(l => (
              <div 
                key={l.id} 
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${activeLeadId === l.id ? 'bg-indigo-50/50 dark:bg-indigo-900/15 border-indigo-500 scale-[1.01]' : 'bg-gray-50/50 dark:bg-gray-900/40 border-gray-150'}`}
                onClick={() => setActiveLeadId(l.id)}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-black">{l.status}</span>
                    <span className="font-extrabold text-sm">{l.company}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-gray-500">{l.id}</span>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed font-medium">نوع محصول: {l.interest} | متولی فعلی: {l.assignedTo}</p>

                <div className="flex justify-between items-center border-t pt-3 mt-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">امیدواری برنده شدن: </span>
                    <span className="font-black text-indigo-600 font-mono bg-white dark:bg-slate-700 px-2 py-0.5 rounded-md">{l.score}%</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleMoveStage(l.id, 'back'); }}
                      className="p-1.5 bg-white border hover:bg-gray-50 rounded-lg font-bold text-[10px] cursor-pointer"
                    >
                      ⬅️ عقب
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleMoveStage(l.id, 'forward'); }}
                      className="p-1.5 bg-indigo-650 text-white hover:bg-indigo-700 rounded-lg text-[10px] cursor-pointer"
                    >
                      مرحله بعد ➡️
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); softDelete('Lead', l, l.company); }}
                      className="p-1.5 bg-rose-50 text-rose-600 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Details CRM timeline */}
        <div className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
          {selectedLead ? (
            <div className="space-y-4">
              <div className="border-b pb-3 mb-3">
                <span className="text-[10px] font-black text-indigo-600 block">مشخصات اقدام و سرنخ منتخب:</span>
                <span className="text-base font-black dark:text-white block mt-1">{selectedLead.name}</span>
                <p className="text-xs text-gray-400 mt-0.5">پایگاه: {selectedLead.company} | ارتباط: {selectedLead.phone}</p>
              </div>

              <div>
                <span className="text-[10px] font-black text-gray-400 block mb-2">ثبت تاریخی قرارها و اقدامات (CRM History Log):</span>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {selectedLead.followUps.map((action, i) => (
                    <div key={i} className="p-2 bg-gray-50 dark:bg-gray-900 rounded-xl leading-relaxed text-[11px] border text-right">
                      <span className="text-[10px] text-gray-400 block border-b pb-1 mb-1">اقدام #{selectedLead.followUps.length - i} :</span>
                      {action}
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleAddNote} className="space-y-2 mt-4">
                <textarea 
                  required
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="افزودن تسک مکالمه، صورت جلسه یا قیمت هاردباکس..."
                  className="w-full text-xs p-3 border rounded-xl bg-gray-50 focus:bg-white h-20"
                />
                <button type="submit" className="w-full py-2 bg-indigo-650 hover:bg-slate-705 text-white font-bold rounded-xl text-xs cursor-pointer">
                  ✓ ثبت قرار بعدی و ارسال نوتیفیکیشن واحد فنی
                </button>
              </form>
            </div>
          ) : (
            <p className="text-center text-gray-400 py-10 text-xs">یک سرنخ را از لیست مجاور گزینش کنید تا پرونده بازرگانی برایتان احیا شود.</p>
          )}
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 6. TAB 3: TREASURY & LIQUIDITY ANALYSIS
// ==========================================
export const TreasuryTab: React.FC = () => {
  const { accounts, cheques, setCheques, logSystemAction } = useB2BERP();
  const [activeAccount, setActiveAccount] = useState<TreasuryAccount | null>(accounts[1]);
  const [sayadIdQuery, setSayadIdQuery] = useState('');
  const [trackStatus, setTrackStatus] = useState<string | null>(null);

  const [chequeSayad, setChequeSayad] = useState('');
  const [chequeBank, setChequeBank] = useState('بانک ملی ایران');
  const [chequeAmt, setChequeAmt] = useState(12000000);
  const [chequeIssuer, setChequeIssuer] = useState('');

  const handleAuditCheque = (e: React.FormEvent) => {
    e.preventDefault();
    if (sayadIdQuery.length !== 16) {
      setTrackStatus('❌ خطا: شناسه صیاد بانک مرکزی باید دقیقاً ۱۶ رقم عددی فاقد حروف باشد.');
      return;
    }
    const val = Number(sayadIdQuery.slice(-1));
    if (val % 3 === 0) {
      setTrackStatus('🟢 وضعیت سفید (خوش‌حساب): صادرکننده فاقد هرگونه چک برگشتی می‌باشد. پذیرش با حد اعتبار تام بلامانع است.');
    } else if (val % 3 === 1) {
      setTrackStatus('🟡 وضعیت زرد: صادرکننده دارای ۱ چک برگشتی اخیر زیر ۵۰ میلیون ریال است. توصیه می‌شود تضامین افزوده دریافت کنید.');
    } else {
      setTrackStatus('🔴 وضعیت قرمز (بدحساب صیادی): صادرکننده دارای ۴ چک برگشتی فعال با ارزش بالا است. طبق مقررات فاز ۲۱، دریافت اکیداً ممنوع!');
    }
    logSystemAction('APPROVE', 'Cheque', sayadIdQuery, `استعلام هوشمند صیادی فرآیند پذیرش بر اساس کدهای بانک مرکزی: پاسخ ${val}`);
  };

  const handleRegisterCheque = (e: React.FormEvent) => {
    e.preventDefault();
    if (chequeSayad.length !== 16 || !chequeIssuer) {
      alert('خطا در ارقام شناسه صیاد یا نام صادرکننده');
      return;
    }
    const newCq: SayadCheque = {
      id: 'CQ-' + (cheques.length + 1),
      chequeNumber: Math.floor(Math.random() * 10000).toString(),
      sayadId: chequeSayad,
      bankName: chequeBank,
      amount: chequeAmt,
      dueDate: '۱۴۰۶/۰۴/۱۵',
      issuerName: chequeIssuer,
      beneficiaryName: 'شرکت اشک قلم',
      status: 'Received'
    };
    setCheques([newCq, ...cheques]);
    logSystemAction('CREATE', 'Cheque', newCq.id, `دریافت اولیه چک صیادی چک شماره ${newCq.chequeNumber} بانک ${chequeBank} از ${chequeIssuer}`);
    setChequeSayad('');
    setChequeIssuer('');
  };

  const handleCheckAction = (id: string, action: SayadCheque['status']) => {
    setCheques(prev => prev.map(c => {
      if (c.id === id) {
        logSystemAction('EDIT', 'Cheque', id, `تغییر کارتابل چک صیادی به وضعیت ${action}`);
        return { ...c, status: action };
      }
      return c;
    }));
  };

  const totalLiquidity = accounts.reduce((acc, c) => acc + c.balance, 0);

  return (
    <div className="space-y-6">
      <PortalHeader />
      <AISystemAdvisor 
        tabContext="خزانه‌داری متمرکز" 
        dataAdvice="موجودی ارزی و ریالی در بانک ملت با شیب ملایم رو به صعود معادل ۴۸۹ میلیون تومان ارزیابی گردید. به جهت پاس شدن آسان چک شماره CQ-1 سررسید ۱۵ خرداد، تعلیق خریدهای غیرضروری مواد شیمیایی در کارگاه لیتوگرافی لغو شد."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-right">
        {/* accounts cashflow */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 text-white p-5 rounded-3xl shadow-xl">
            <span className="text-[10px] text-indigo-200 font-bold block">مجموع کل نقدینگی و ظرفیت خزانه‌داری：</span>
            <span className="text-2xl font-black block mt-2">{totalLiquidity.toLocaleString()} ریال</span>
            <p className="text-[10px] text-indigo-250 mt-1">تلفیق همزمان نقدینگی کارگاه، صندوق، پاییزه صادراتی و درگاه زرین شتاب</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-lg border">
            <h4 className="font-extrabold text-sm mb-3">حساب‌های خزانه‌داری کارگاه چاپ</h4>
            <div className="space-y-2.5">
              {accounts.map(acc => (
                <div 
                  key={acc.id} 
                  onClick={() => setActiveAccount(acc)}
                  className={`p-3 rounded-xl border cursor-pointer flex justify-between items-center text-xs ${activeAccount?.id === acc.id ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20' : 'bg-gray-50/40'}`}
                >
                  <div>
                    <span className="font-bold block">{acc.name}</span>
                    <span className="text-[9px] text-gray-400 mt-0.5">{acc.type}</span>
                  </div>
                  <span className="font-black font-mono text-indigo-600">{acc.balance.toLocaleString()} ت</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* sayad checks inspector */}
        <div className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border">
          <div className="flex justify-between items-center pb-4 mb-4 border-b">
            <div>
              <h3 className="font-black text-lg">سامانه یکپارچه مانیتورینگ چک‌های صیاد با بانک مرکزی (فاز ۲۱)</h3>
              <p className="text-xs text-gray-400">رهگیری، پاس کردن، عودت و انتقال چک‌های ضمانتی و تجاری با تاییدیه ثبتی</p>
            </div>
          </div>

          {/* Sayad Check Validator tool */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border text-xs">
              <span className="text-[10px] text-indigo-600 font-black block mb-1">🔗 استعلام صحت اعتبار چک صیاد بانک مرکزی (۱۶ رقم):</span>
              <form onSubmit={handleAuditCheque} className="flex gap-1.5 mt-2">
                <input 
                  required
                  placeholder="شناسه ۱۶ رقمی صیادی چک..." 
                  value={sayadIdQuery}
                  onChange={e => setSayadIdQuery(e.target.value)}
                  className="p-2 border rounded-xl flex-1 text-center font-mono font-bold bg-white text-gray-900" 
                />
                <button type="submit" className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer">
                  سنجش
                </button>
              </form>
              {trackStatus && (
                <p className="mt-3 p-2.5 bg-white dark:bg-slate-800 rounded-xl font-semibold border text-[11px] leading-relaxed">
                  {trackStatus}
                </p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border text-xs">
              <span className="text-[10px] text-indigo-600 font-black block mb-1">✍️ ثبت دریافت فیزیکی برگه چک صیاد جدید:</span>
              <form onSubmit={handleRegisterCheque} className="grid grid-cols-2 gap-2 mt-2">
                <input placeholder="شناسه ۱۶ رقمی" required maxLength={16} value={chequeSayad} onChange={e=>setChequeSayad(e.target.value)} className="p-1.5 border rounded text-center text-[10px] font-mono" />
                <input placeholder="نام صادرکننده" required value={chequeIssuer} onChange={e=>setChequeIssuer(e.target.value)} className="p-1.5 border rounded text-[10px]" />
                <input placeholder="نام بانک" value={chequeBank} onChange={e=>setChequeBank(e.target.value)} className="p-1.5 border rounded text-[10px]" />
                <input 
                  type="text" 
                  inputMode="numeric"
                  placeholder="مبلغ (تومان)" 
                  value={chequeAmt === 0 ? '' : chequeAmt} 
                  onChange={e=>setChequeAmt(parsePersianFloat(e.target.value))} 
                  className="p-1.5 border rounded text-[10px]" 
                />
                <button type="submit" className="col-span-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] cursor-pointer">ثبت و استعلام اتوماتیک صیاد</button>
              </form>
            </div>
          </div>

          <div className="space-y-3">
            {cheques.map(cq => (
              <div key={cq.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 text-xs border border-gray-150">
                <div className="flex justify-between items-center mb-1">
                  <div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-2 ${cq.status === 'Cleared' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {cq.status}
                    </span>
                    <strong className="text-sm">مبلغ: {cq.amount.toLocaleString()} تومان</strong>
                  </div>
                  <span className="font-mono text-gray-500 font-bold">{cq.chequeNumber}#{cq.bankName}</span>
                </div>
                
                <p className="text-slate-500 mt-1">شناسه صیاد بانک مرکزی: <strong className="font-mono text-black dark:text-white">{cq.sayadId}</strong> | سررسید: {cq.dueDate}</p>
                <p className="text-slate-400 text-[10px] mt-0.5">صادرکننده: {cq.issuerName} | به نفع: {cq.beneficiaryName}</p>

                <div className="flex justify-end gap-1.5 border-t pt-3 mt-3">
                  <button 
                    onClick={() => handleCheckAction(cq.id, 'Cleared')}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] cursor-pointer"
                  >
                    ✓ وصول نهایی
                  </button>
                  <button 
                    onClick={() => handleCheckAction(cq.id, 'Returned')}
                    className="px-2.5 py-1.5 bg-rose-650 hover:bg-rose-700 text-white rounded-lg font-bold text-[10px] cursor-pointer"
                  >
                    ⚠️ برگشت زدن
                  </button>
                  <button 
                    onClick={() => handleCheckAction(cq.id, 'Transferred')}
                    className="px-2.5 py-1.5 bg-indigo-50 border hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] cursor-pointer"
                  >
                    حقوق طراح / انتقال ➡️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 7. TAB 4: DOUBLE-ENTRY VOUCHERS (RECEIPTS)
// ==========================================
export const ReceiptsTab: React.FC = () => {
  const { vouchers, setVouchers, accounts, setAccounts, logSystemAction, softDelete } = useB2BERP();
  const [activeVoucherId, setActiveVoucherId] = useState<string | null>('VCH-3');
  const [showAddVoucher, setShowAddVoucher] = useState(false);

  // New Voucher
  const [vType, setVType] = useState<'Receipt' | 'Payment'>('Receipt');
  const [vMethod, setVMethod] = useState<Voucher['method']>('Bank Transfer');
  const [vAmt, setVAmt] = useState(15000000);
  const [vDesc, setVDesc] = useState('');
  const [vBeneficiary, setVBeneficiary] = useState('');

  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vDesc || !vBeneficiary) return;

    const newV: Voucher = {
      id: 'VCH-' + Date.now().toString().slice(-4),
      type: vType,
      amount: vAmt,
      method: vMethod,
      description: vDesc,
      beneficiary: vBeneficiary,
      approvedByAccounting: false,
      approvedByDirector: false,
      date: new Date().toLocaleDateString('fa-IR')
    };

    setVouchers([newV, ...vouchers]);
    logSystemAction('CREATE', 'Voucher', newV.id, `صدور موقت فیش مالی ${vType} به ارزش ${vAmt.toLocaleString()} ت`);
    setShowAddVoucher(false);
    setVDesc('');
    setVBeneficiary('');
  };

  const handleApproveAccounting = (id: string) => {
    setVouchers(prev => prev.map(v => {
      if (v.id === id) {
        logSystemAction('APPROVE', 'Voucher', id, 'تایید موقت و اصالت‌سنجی فیش توسط رئیس حسابداری ارشد');
        return { ...v, approvedByAccounting: true };
      }
      return v;
    }));
  };

  const handleApproveDirector = (id: string) => {
    setVouchers(prev => {
      const match = prev.find(v => v.id === id);
      if (match) {
        // Double Entry Simulation!
        setAccounts(prevAcc => prevAcc.map(acc => {
          // Add/Subtract from Bank Account ملت
          if (acc.id === 'TR-102') {
            const multi = match.type === 'Receipt' ? 1 : -1;
            return { ...acc, balance: acc.balance + (match.amount * multi) };
          }
          return acc;
        }));
        logSystemAction('APPROVE', 'Voucher', id, `تاییدیه نهایی هیئت مدیره صادر شد. موجودی بانک ملت به اندازه ${match.amount.toLocaleString()} تومان با فرمول دوطرفه تسویه گشت`, undefined, JSON.stringify(match));
        alert('سند با موفقیت تایید نهایی شد. موجودی بانکی به روز رسانی شد.');
      }
      return prev.map(v => {
        if (v.id === id) return { ...v, approvedByDirector: true };
        return v;
      });
    });
  };

  const activeVoucher = vouchers.find(v => v.id === activeVoucherId) || vouchers[0];

  return (
    <div className="space-y-6">
      <PortalHeader />
      <AISystemAdvisor 
        tabContext="قبوض و اسناد حسابداری" 
        dataAdvice="سند حسابداری VCH-3 به ارزش ۴۸,۰۰۰,۰۰۰ تومان نیاز به تایید نهایی مدیریت دارد. با توجه به خوش‌حسابی صادراتی آرتین رفسنجان و فاقد سابقه سوء چک صیاد، تایید فوری آن توصیه می‌شود تا در معین به ثبت نهایی و سهم‌الارث گرافیست بنشیند."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-right">
        {/* vouchers lists */}
        <div className="lg:col-span-7 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border">
          <div className="flex justify-between items-center mb-4 pb-2 border-b">
            <div>
              <h3 className="font-extrabold text-base">لیست اسناد دو طرفه دریافت و پرداخت</h3>
              <p className="text-xs text-gray-400">تاییدیه‌های مالیاتی، فاکتورهای ترخیص زینک و تسویه‌حساب‌های سهم طراح مستقل</p>
            </div>
            <button 
              onClick={() => setShowAddVoucher(!showAddVoucher)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer animate-pulse"
            >
              {showAddVoucher ? 'بستن فرم' : '📝 صدور سند موقت'}
            </button>
          </div>

          {showAddVoucher && (
            <form onSubmit={handleCreateVoucher} className="p-4 bg-gray-50 rounded-2xl mb-4 text-xs space-y-3 border">
              <div className="grid grid-cols-2 gap-3">
                <select value={vType} onChange={e=>setVType(e.target.value as any)} className="p-2 border rounded">
                  <option value="Receipt">دریافت ریالی (Receipt - بدهکار بانکی)</option>
                  <option value="Payment">پرداخت هزینه‌ها (Payment - بستانکار بانکی)</option>
                </select>
                <select value={vMethod} onChange={e=>setVMethod(e.target.value as any)} className="p-2 border rounded">
                  <option value="Bank Transfer">پایا / ساتنا (Bank Transfer)</option>
                  <option value="Cheque">برگه چک صیاد (Cheque)</option>
                  <option value="Online">درگاه پرداخت شتاب وب‌سایت</option>
                  <option value="System Wallet">کیف پول لیتوگرافی (Wallet)</option>
                </select>
                <input required placeholder="عنوان شخص بستانکاری / طرف سود" value={vBeneficiary} onChange={e=>setVBeneficiary(e.target.value)} className="p-2 border rounded" />
                <input 
                  type="text" 
                  inputMode="numeric"
                  placeholder="ارزش (تومان)" 
                  value={vAmt === 0 ? '' : vAmt} 
                  onChange={e=>setVAmt(parsePersianFloat(e.target.value))} 
                  className="p-2 border rounded" 
                />
                <input required placeholder="شرح سند مالیاتی با جزییات سفارش" value={vDesc} onChange={e=>setVDesc(e.target.value)} className="p-2 border rounded col-span-2" />
              </div>
              <button type="submit" className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold">ثبت نهایی پیش‌نویس سند</button>
            </form>
          )}

          <div className="space-y-2.5">
            {vouchers.map(v => (
              <div 
                key={v.id} 
                onClick={() => setActiveVoucherId(v.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${activeVoucherId === v.id ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20' : 'bg-gray-50/40 text-gray-500'}`}
              >
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] px-2 rounded-full font-bold ${v.type === 'Receipt' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {v.type === 'Receipt' ? 'دریافت' : 'پرداخت'}
                  </span>
                  <span className="font-extrabold text-sm">{v.beneficiary}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed font-semibold mt-1">{v.description}</p>
                <p className="text-[10px] text-gray-400 mt-1 flex justify-between">
                  <span>ارزش: {v.amount.toLocaleString()} تومان | روش: {v.method}</span>
                  <span>تاریخ: {v.date}</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* voucher detail panel with signature */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border">
          {activeVoucher ? (
            <div className="space-y-4">
              <span className="text-[10px] font-black text-indigo-500 block">بررسی و گیت امن تایید اعتبار سند：</span>
              <h4 className="font-extrabold text-sm text-gray-900 dark:text-white leading-relaxed">{activeVoucher.description}</h4>

              <div className="text-xs space-y-2 bg-slate-50 dark:bg-slate-900 border p-4 rounded-2xl">
                <p>مبلغ معین: <strong className="font-mono text-black dark:text-white">{activeVoucher.amount.toLocaleString()} تومان</strong></p>
                <p>کاربر ذینفع پایگاه: {activeVoucher.beneficiary}</p>
                <p>کانال پرداخت: {activeVoucher.method}</p>
                <p>بررسی حسابداری: <span className={activeVoucher.approvedByAccounting ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>{activeVoucher.approvedByAccounting ? 'تایید شده (کد ثبت دفتری ۴۸۹)' : 'در انتظار بررسی'}</span></p>
                <p>تایید نهایی هیئت مدیره: <span className={activeVoucher.approvedByDirector ? 'text-emerald-500 font-bold' : 'text-red-500 font-bold'}>{activeVoucher.approvedByDirector ? 'تایید و تسویه واریزی بانک' : 'در انتظار گواهی امضاء مدیر'}</span></p>
              </div>

              <div className="flex flex-col gap-2 mt-4">
                {!activeVoucher.approvedByAccounting && (
                  <button 
                    onClick={() => handleApproveAccounting(activeVoucher.id)}
                    className="w-full py-2.5 bg-gradient-to-l from-indigo-500 to-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-lg"
                  >
                    📝 مهر و تایید حسابدار ارشد
                  </button>
                )}
                {activeVoucher.approvedByAccounting && !activeVoucher.approvedByDirector && (
                  <button 
                    onClick={() => handleApproveDirector(activeVoucher.id)}
                    className="w-full py-2.5 bg-gradient-to-l from-emerald-500 to-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-lg animate-pulse"
                  >
                    🖊️ امضاء و پاس کردن فیزیکی موجودی (مدیر عامل)
                  </button>
                )}
                <button
                  onClick={() => softDelete('Voucher', activeVoucher, activeVoucher.beneficiary)}
                  className="w-full py-2 bg-red-50 text-red-650 hover:bg-red-100 rounded-xl text-xs font-bold cursor-pointer text-center"
                >
                  ابطال سند و انتقال به زباله‌دان
                </button>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-400 py-10 text-xs">یک سند مالی موقت را انتخاب کنید تا امکان مانیتورینگ حسابداری فعال شود.</p>
          )}
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 8. TAB 5: DMS (DOCUMENT VERIFIED VAULT)
// ==========================================
export const ContractsTab: React.FC = () => {
  const { documents, setDocuments, logSystemAction } = useB2BERP();
  const [activeDocId, setActiveDocId] = useState<string | null>('DOC-101');
  const [isSignCanvasActive, setIsSignCanvasActive] = useState(false);
  const [changeLogNote, setChangeLogNote] = useState('');
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const activeDoc = documents.find(d => d.id === activeDocId) || documents[0];

  const handleUpdateRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeLogNote || !activeDoc) return;

    setDocuments(prev => prev.map(d => {
      if (d.id === activeDoc.id) {
        const nextVer = 'v' + (parseFloat(d.version.substring(1)) + 0.1).toFixed(1);
        const log = {
          version: nextVer,
          updater: 'ادمین سیستم (لیتوگراف)',
          date: new Date().toLocaleDateString('fa-IR'),
          changeLog: changeLogNote
        };
        logSystemAction('EDIT', 'Document', d.id, `ایجاد نسخه اصلاحی جدید ${nextVer}: ${changeLogNote}`, d.version, nextVer);
        return {
          ...d,
          version: nextVer,
          revisedBy: 'لیتوگراف عتیق',
          lastUpdated: new Date().toLocaleDateString('fa-IR'),
          versionsHistory: [log, ...d.versionsHistory]
        };
      }
      return d;
    }));
    setChangeLogNote('');
    alert('قرارداد با موفقیت آپدیت و نسخه جدید بارگذاری شد.');
  };

  const handleToggleDocLock = () => {
    if (!activeDoc) return;
    setDocuments(prev => prev.map(d => {
      if (d.id === activeDoc.id) {
        const nextLock = !d.isLocked;
        logSystemAction('EDIT', 'Document', d.id, nextLock ? 'قفل کردن داکیومنت جهت جلوگیری از تداخل نسخه' : 'آزادسازی قفل داکیومنت لیتوگرافی');
        return { ...d, isLocked: nextLock, status: nextLock ? 'Locked' : 'Draft' };
      }
      return d;
    }));
  };

  // Electronic Signature canvas implementation
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#4338ca'; // indigo-700
    ctx.lineWidth = 3;
    ctx.stroke();
  };

  const saveSignature = () => {
    if (!activeDoc || !canvasRef.current) return;
    const signaturePng = canvasRef.current.toDataURL();
    setDocuments(prev => prev.map(d => {
      if (d.id === activeDoc.id) {
        logSystemAction('SIGN', 'Document', d.id, 'ثبت و مهر فیزیکال نقشه قالب و امضای الکترونیک مشتری');
        return { ...d, status: 'Digitally Signed', signaturePng };
      }
      return d;
    }));
    setIsSignCanvasActive(false);
    alert('امضای الکترونیکی با موفقیت بر بدنه قرارداد الحاق شد.');
  };

  return (
    <div className="space-y-6">
      <PortalHeader />
      <AISystemAdvisor 
        tabContext="مدیریت مستندات (DMS)" 
        dataAdvice="نقشه قالب کشویی (DOC-102) در وضعیت قفل‌شده (Locked) قرار گرفته است تا تداخلی مابین خروجی DXF گرافیست مستقل و ماشین دایکاتی کارگاه اشک قلم رخ ندهد. برای پلات جدید ابتدا دکمه آزادسازی قفل را بررسی نمایید."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-right">
        {/* Docs List */}
        <div className="lg:col-span-6 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border">
          <h3 className="font-extrabold text-base mb-4 flex items-center gap-2">
            <FileCode className="w-5 h-5 text-indigo-500" />
            <span>مخزن مستندات و نقشه‌های مهندسی سازه (Enterprise DMS)</span>
          </h3>

          <div className="space-y-3.5">
            {documents.map(doc => (
              <div 
                key={doc.id} 
                onClick={() => setActiveDocId(doc.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${activeDocId === doc.id ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20' : 'bg-gray-50/40'}`}
              >
                <div>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-700 px-2.5 py-0.5 rounded-full ml-2 font-black">{doc.category}</span>
                  <span className="font-extrabold text-sm block mt-2">{doc.title}</span>
                  <p className="text-[10px] text-gray-400 mt-1">نسخه فعال: {doc.version} | مشتری هدف: {doc.clientName}</p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-mono text-gray-400">{doc.lastUpdated}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${doc.isLocked ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {doc.isLocked ? '🔒 قفل' : '🔓 ویرایش آزاد'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* revision and canvas signature */}
        <div className="lg:col-span-6 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border space-y-4">
          {activeDoc ? (
            <div>
              <div className="flex justify-between items-center pb-3 border-b mb-3">
                <div>
                  <span className="text-xs text-gray-400">شناسه مستند: {activeDoc.id}</span>
                  <h4 className="font-black text-sm block mt-0.5">{activeDoc.title}</h4>
                </div>
                
                <button
                  onClick={handleToggleDocLock}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-250 text-xs font-black rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  {activeDoc.isLocked ? <Unlock className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-red-500" />}
                  <span>{activeDoc.isLocked ? 'آزاد سازی سند' : 'قفل کردن نسخه'}</span>
                </button>
              </div>

              {/* Version Rollback block */}
              <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-2xl mb-4 text-xs">
                <span className="font-bold text-indigo-600 block mb-2">📜 تاریخچه تغییرات و بازنگری‌های فنی (Revisions):</span>
                <div className="space-y-2.5 max-h-36 overflow-y-auto">
                  {activeDoc.versionsHistory.map((h, i) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded-xl border">
                      <div>
                        <strong>{h.version} ({h.updater}):</strong>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{h.changeLog}</p>
                      </div>
                      <span className="text-[9px] font-mono text-gray-400">{h.date}</span>
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleUpdateRevision} className="space-y-2 mb-4">
                <input 
                  disabled={activeDoc.isLocked}
                  required
                  placeholder={activeDoc.isLocked ? 'داکیومنت قفل شده است. ابتدا آن را آزاد کنید.' : 'توضیح تغییر خط تا یا اصلاح ضخامت ایندربرد...'} 
                  value={changeLogNote}
                  onChange={e => setChangeLogNote(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-xl bg-gray-50 text-gray-900" 
                />
                <button 
                  type="submit" 
                  disabled={activeDoc.isLocked}
                  className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  ➕ ثبت و انتشار نسخه جدید (Auto Version Rollup)
                </button>
              </form>

              {/* Live Canvas Signature simulation */}
              <div className="border-t pt-4">
                <span className="text-[10px] text-gray-400 font-bold block mb-2">✍️ امضاء زنده و الحاق مهر اصالت مشتری (Digital signature):</span>
                {activeDoc.signaturePng ? (
                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 rounded-2xl flex flex-col items-center">
                    <img src={activeDoc.signaturePng} className="h-20 object-contain" alt="Signature" />
                    <span className="text-[9px] text-indigo-600 font-bold block mt-1">✓ امضای دیجیتال اصیل معتبر است.</span>
                  </div>
                ) : (
                  <div>
                    {!isSignCanvasActive ? (
                      <button 
                        onClick={() => setIsSignCanvasActive(true)}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs cursor-pointer text-center"
                      >
                        🖊️ بازکردن پد امضای دیجیتال مشتری
                      </button>
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-2xl flex flex-col items-center gap-2 border">
                        <canvas 
                          ref={canvasRef} 
                          width={300} 
                          height={120} 
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={() => setIsDrawing(false)}
                          className="bg-white border rounded-xl cursor-crosshair shadow-inner" 
                        />
                        <div className="flex gap-2">
                          <button onClick={saveSignature} className="px-3 py-1 bg-indigo-600 text-indigo-50 font-bold text-[10px] rounded-lg cursor-pointer">ثبت امضاء</button>
                          <button onClick={() => {
                            const canvas = canvasRef.current;
                            if (canvas) canvas.getContext('2d')?.clearRect(0,0, canvas.width, canvas.height);
                          }} className="px-3 py-1 bg-gray-200 text-gray-700 text-[10px] rounded-lg cursor-pointer">پاکسازی</button>
                          <button onClick={() => setIsSignCanvasActive(false)} className="px-3 py-1 bg-red-100 text-red-650 text-[10px] rounded-lg">لگو</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-400 py-10 text-xs font-semibold">یک پرونده فنی انتخاب کنید تا گیت بازنگری و امضاء احیا اطلاعات فعال شود.</p>
          )}
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 9. TAB 6: ERP FLOW INTEGRATOR & BPM DESIGNER
// ==========================================
export const ERPIntegrationTab: React.FC = () => {
  const { bpmNodes, setBpmNodes, logSystemAction } = useB2BERP();
  const [interactiveLog, setInteractiveLog] = useState<string[]>([
    'آماده بکارگیری زنجیره تامین فاز ۲۱...',
    'بر روی گام‌ها کلیک کنید تا تاثیر دوطرفه خزانه‌داری صیادی و انبار مقوای سوئدی را پایش کنید.'
  ]);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);
  const [isSimActive, setIsSimActive] = useState(false);

  const [newNodeTitle, setNewNodeTitle] = useState('');
  const [newNodeRole, setNewNodeRole] = useState('واحد طراحی');

  const handleAddNewBpmNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeTitle) return;

    const node: BpmNode = {
      id: 'node-' + (bpmNodes.length + 1),
      title: newNodeTitle,
      role: newNodeRole,
      status: 'Pending',
      type: 'Task'
    };
    setBpmNodes([...bpmNodes, node]);
    logSystemAction('CREATE', 'Workflow', node.id, `افزودن تسک پویا به فلوچارت لیتوگرافی B2B: ${newNodeTitle} - متولی: ${newNodeRole}`);
    setNewNodeTitle('');
    alert('گره فلوچارت با موفقیت به چرخه لیتوگرافی افزوده شد.');
  };

  const handleTriggerERPWorkflows = async () => {
    if (isSimActive) return;
    setIsSimActive(true);
    setInteractiveLog([]);

    for (let i = 0; i < bpmNodes.length; i++) {
      setActiveStepIndex(i);
      
      // Mutate status to Completed or Active dynamically
      setBpmNodes(prev => prev.map((n, idx) => {
        if (idx === i) return { ...n, status: 'Active' };
        if (idx < i) return { ...n, status: 'Completed' };
        return n;
      }));

      setInteractiveLog(prev => [
        `🔥 [گام ${i+1}] فعال‌سازی بخش: ${bpmNodes[i].title} (مسئول: ${bpmNodes[i].role})`,
        `✓ معین خزانه‌داری و انبارداری بصورت اتوماتیک در پشت صحنه کدهای تاییدیه مالیاتی را تراز کردند.`,
        ...prev
      ]);

      await new Promise(r => setTimeout(r, 1600));
    }

    setBpmNodes(prev => prev.map(n => ({ ...n, status: 'Completed' })));
    setInteractiveLog(prev => [
      '🎉 چرخه کامل هوشمند ERP فاز ۲۱ تکمیل شد! کلیه اسناد صیاد به پاس نهایی نشسته و ریسک زنجیره به حداقل رسید.',
      ...prev
    ]);
    setIsSimActive(false);
  };

  return (
    <div className="space-y-6">
      <PortalHeader />
      <AISystemAdvisor 
        tabContext="فلوچارت‌های یکپارچه صنعتی" 
        dataAdvice="طراحی گام چهارم (تایید نهایی گرافیست مستقل) روی پورتال طراحان قرار گرفته است. با ایجاد این هرتز کاری سرعت ارسال زینک‌ها به ۴ رنگ هایدلبرگ را تا ۴۰٪ ارتقا می‌بخشیم."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-right">
        {/* custom workflow builder visual */}
        <div className="lg:col-span-7 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border text-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
            <div>
              <h3 className="text-base font-black">طراح پویای فرآیندهای کسب‌وکار (BPM Visual Flow Designer)</h3>
              <p className="text-xs text-gray-400 mt-0.5">افزایش یا ویرایش شیفت‌های کاری کارگاه دایکات و تاییدهای چند مرحله‌ای بدون کدنویسی</p>
            </div>
            
            <button
              onClick={handleTriggerERPWorkflows}
              className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition-all shadow"
            >
              {isSimActive ? 'تولید جریان فعال...' : '⚡ اجرای سناریوی جامع تحویل'}
            </button>
          </div>

          <div className="space-y-3 mb-6">
            {bpmNodes.map((n, idx) => (
              <div 
                key={n.id}
                className={`p-3.5 rounded-2xl border flex justify-between items-center transition-all ${
                  idx === activeStepIndex 
                    ? 'bg-amber-500/10 border-amber-500 scale-[1.01]' 
                    : n.status === 'Completed' 
                    ? 'bg-emerald-500/5 border-emerald-500/30 font-medium' 
                    : 'bg-gray-50/50'
                }`}
              >
                <div>
                  <span className="font-extrabold text-[#2a2a2a] dark:text-gray-200 block text-xs">{idx+1}. {n.title}</span>
                  <p className="text-[10px] text-gray-400 mt-1">متولی فرآیند: {n.role} </p>
                </div>

                <div className="flex items-center gap-1.5 font-bold">
                  <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{n.role}</span>
                  <span className={`text-[9.5px] px-2 py-0.5 rounded-sm ${n.status === 'Completed' ? 'text-emerald-600 bg-emerald-50' : n.status === 'Active' ? 'text-amber-600 bg-amber-50 animate-pulse' : 'text-gray-400'}`}>
                    {n.status === 'Completed' ? 'تکمیل' : n.status === 'Active' ? 'درحال اجرا' : 'در نوبت'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Add custom BPM node element form */}
          <form onSubmit={handleAddNewBpmNode} className="p-4 bg-gray-50 dark:bg-slate-900 rounded-2xl grid grid-cols-2 gap-2 text-xs border">
            <div>
              <label className="block mb-1 font-bold">عنوان سرفصل اقدام:</label>
              <input required value={newNodeTitle} onChange={e=>setNewNodeTitle(e.target.value)} className="w-full p-2 border bg-white text-gray-900 rounded-lg text-xs" placeholder="تایید کیفیت شابلون طلاکوب" />
            </div>
            <div>
              <label className="block mb-1 font-bold">بخش / فرد مسئول ارزیابی:</label>
              <select value={newNodeRole} onChange={e=>setNewNodeRole(e.target.value)} className="w-full p-2 border bg-white rounded-lg text-xs">
                <option value="بر برنامه‌ریزی">واحد لیتوگرافی (Litho)</option>
                <option value="کنترل کیفیت">کنترل کیفیت فیزیکی (QC)</option>
                <option value="مدیر عامل">مدیر عامل / ناظر عالی</option>
                <option value="ترابری">ترابری و راننده (Delivery)</option>
              </select>
            </div>
            <button type="submit" className="col-span-2 py-2 bg-emerald-650 text-white rounded-xl font-bold cursor-pointer hover:bg-emerald-700">✓ الحاق گره تایید الحاقی به کارتابل</button>
          </form>
        </div>

        {/* Console real-time */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border flex flex-col justify-between">
          <div>
            <h4 className="font-extrabold text-sm mb-2 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>کنسول رویدادهای زنده زنجیره تامین (Real-time ERP Log):</span>
            </h4>
            <p className="text-[10px] text-gray-400 mb-4 border-b pb-1">پایش هموژن کاغذ ورودی، پورتال گرافیست‌ها و صندوق ریالی</p>

            <div className="bg-slate-950 text-emerald-400 font-mono text-[10px] p-4 rounded-2xl h-80 overflow-y-auto space-y-2 text-left leading-relaxed">
              {interactiveLog.map((log, index) => (
                <div key={index} className="flex gap-2 leading-relaxed">
                  <span className="text-gray-500 font-mono">[{new Date().toLocaleTimeString('fa-IR')}]</span>
                  <span className="break-words w-full">{log}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-l from-indigo-50 to-indigo-100/40 p-4 border rounded-xl mt-4 font-mono text-[10px] leading-relaxed text-indigo-900 text-right leading-5">
            <strong>💡 تلاقی خودکار اسناد در خزانه‌داری:</strong>
            <p className="mt-1">
              صدور و پیشرفت گام‌ها به صورت خودکار باعث کسر از موجودی مقوای ایندربرد در انبار و الحاق سهم ۵٪ پورسانت گرافیست بر بستانکاری امین کاظمی در ماژول CRM خواهد شد.
            </p>
          </div>
        </div>
      </div>

      <SecureAuditLogsWidget />
    </div>
  );
};
