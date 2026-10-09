import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useContent } from '../contexts/ContentContext';
import { 
  UserCheck, Shield, Key, UserPlus, Trash, Edit, CheckSquare, Square, 
  Lock, Phone, Mail, User, Briefcase, Calendar, FolderLock, Sparkles, CheckCircle, AlertTriangle
} from 'lucide-react';
import { Card, Button, Badge } from './UIComponents';
import { 
  getAllUsersExcludingPassword, createTeamAccount, updateAccount, deleteAccount, UserPermissions 
} from '../services/authService';
import { UserRole } from '../types';

const renderAvatarOffline = (url: string | null, name: string, sizeClass = "w-10 h-10 text-xs") => {
  const initial = name ? name[0] : '?';
  const colors = [
    'bg-indigo-600 text-white font-bold',
    'bg-teal-600 text-white font-bold',
    'bg-violet-600 text-white font-bold',
    'bg-sky-600 text-white font-bold',
    'bg-amber-600 text-white font-bold',
    'bg-purple-600 text-white font-bold',
    'bg-rose-600 text-white font-bold'
  ];
  const charCodeSum = name ? [...name].reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
  const bgClass = colors[charCodeSum % colors.length];

  if (!url || url.includes('pravatar.cc')) {
    return (
      <div className={`${sizeClass} rounded-full flex items-center justify-center uppercase shadow-sm border border-slate-200 dark:border-slate-700 ${bgClass}`}>
        {initial}
      </div>
    );
  }

  return (
    <img 
      src={url} 
      alt={name} 
      className={`${sizeClass} rounded-full object-cover border border-slate-200 dark:border-slate-700`}
      onError={(e) => {
        e.currentTarget.style.display = 'none';
        const parent = e.currentTarget.parentNode;
        if (parent) {
          const fallback = document.createElement('div');
          fallback.className = `${sizeClass} rounded-full flex items-center justify-center uppercase border border-slate-200 dark:border-slate-700 ${bgClass}`;
          fallback.innerText = initial;
          parent.appendChild(fallback);
        }
      }}
    />
  );
};

export const TeamManagementPanel: React.FC<{ isDarkMode?: boolean }> = ({ isDarkMode = false }) => {
  const { user: currentUser } = useAuth();
  const { uploadAsset } = useContent();

  const [users, setUsers] = useState<any[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // My Profile Edit State
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [profilePassword, setProfilePassword] = useState('');

  // New Account State
  const [newAccName, setNewAccName] = useState('');
  const [newAccUsername, setNewAccUsername] = useState('');
  const [newAccPassword, setNewAccPassword] = useState('');
  const [newAccPhone, setNewAccPhone] = useState('');
  const [newAccEmail, setNewAccEmail] = useState('');
  const [newAccRole, setNewAccRole] = useState<UserRole>(UserRole.SMB);
  const [newAccPermissions, setNewAccPermissions] = useState<UserPermissions>({
    crmDashboard: true,
    treasuryAndLedger: false,
    inquiryRateSettings: false,
    cmsContentEditing: false,
    backupSystem: false,
  });

  // Editing existing account state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editAccName, setEditAccName] = useState('');
  const [editAccPassword, setEditAccPassword] = useState('');
  const [editAccPhone, setEditAccPhone] = useState('');
  const [editAccEmail, setEditAccEmail] = useState('');
  const [editAccRole, setEditAccRole] = useState<UserRole>(UserRole.SMB);
  const [editAccPermissions, setEditAccPermissions] = useState<UserPermissions>({
    crmDashboard: true,
    treasuryAndLedger: false,
    inquiryRateSettings: false,
    cmsContentEditing: false,
    backupSystem: false,
  });

  useEffect(() => {
    loadUsers();
    if (currentUser) {
      setProfileName(currentUser.name || '');
      setProfilePhone(currentUser.phone || '');
      setProfileEmail(currentUser.email || '');
      setProfileAvatar(currentUser.avatar || '');
    }
  }, [currentUser]);

  const loadUsers = () => {
    const data = getAllUsersExcludingPassword();
    setUsers(data);
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  };

  // Profile Image Upload
  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUser) {
      try {
        const asset = await uploadAsset(file);
        if (asset && asset.data) {
          setProfileAvatar(asset.data);
          // Auto update in database
          await updateAccount(currentUser.id, { avatar: asset.data });
          showSuccess('تصویر پروفایل شما با موفقیت به روز گردید.');
          loadUsers();
        }
      } catch (err) {
        showError('خطا در بارگذاری تصویر.');
      }
    }
  };

  // Update My Profile Fields
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const fieldsToUpdate: any = {
      name: profileName,
      phone: profilePhone,
      email: profileEmail,
      avatar: profileAvatar,
    };

    if (profilePassword.trim()) {
      fieldsToUpdate.password = profilePassword;
    }

    const res = await updateAccount(currentUser.id, fieldsToUpdate);
    if (res.success) {
      showSuccess('اطلاعات کاربری پروفایل شما با موفقیت ذخیره گردید.');
      setProfilePassword('');
      loadUsers();
    } else {
      showError(res.error || 'بروز خطا در ویرایش اطلاعات.');
    }
  };

  // Toggle checklist permission helper
  const handleTogglePerm = (key: keyof UserPermissions, isEdit: boolean = false) => {
    if (isEdit) {
      setEditAccPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    } else {
      setNewAccPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  // Submit New account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName || !newAccUsername) {
      showError('نام کامل و نام کاربری برای ساخت الزامی است.');
      return;
    }

    const res = await createTeamAccount({
      name: newAccName,
      username: newAccUsername,
      password: newAccPassword || '123456',
      role: newAccRole,
      phone: newAccPhone,
      email: newAccEmail,
      permissions: newAccPermissions
    });

    if (res.success) {
      showSuccess(`کاربر تیم با آیدی "${newAccUsername}" ایجاد گردید.`);
      setNewAccName('');
      setNewAccUsername('');
      setNewAccPassword('');
      setNewAccPhone('');
      setNewAccEmail('');
      setNewAccRole(UserRole.SMB);
      setNewAccPermissions({
        crmDashboard: true,
        treasuryAndLedger: false,
        inquiryRateSettings: false,
        cmsContentEditing: false,
        backupSystem: false,
      });
      loadUsers();
    } else {
      showError(res.error || 'خطا در افزودن کاربر.');
    }
  };

  // Save edit changes
  const handleSaveEditAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;

    const fieldsToUpdate: any = {
      name: editAccName,
      phone: editAccPhone,
      email: editAccEmail,
      role: editAccRole,
      permissions: editAccPermissions
    };

    if (editAccPassword.trim()) {
      fieldsToUpdate.password = editAccPassword;
    }

    const res = await updateAccount(editingUserId, fieldsToUpdate);
    if (res.success) {
      showSuccess('تغییرات کاربر با موفقیت اعمال شد.');
      setEditingUserId(null);
      loadUsers();
    } else {
      showError(res.error || 'خطا در ثبت تغییرات.');
    }
  };

  const handleStartEdit = (userToEdit: any) => {
    setEditingUserId(userToEdit.id);
    setEditAccName(userToEdit.name || '');
    setEditAccPhone(userToEdit.phone || '');
    setEditAccEmail(userToEdit.email || '');
    setEditAccRole(userToEdit.role || UserRole.SMB);
    setEditAccPassword('');
    setEditAccPermissions(userToEdit.permissions || {
      crmDashboard: true,
      treasuryAndLedger: false,
      inquiryRateSettings: false,
      cmsContentEditing: false,
      backupSystem: false,
    });
  };

  const handleDeleteAccount = async (id: string, name: string) => {
    if (confirm(`آیا از حذف حساب دسترسی "${name}" اطمینان کامل دارید؟`)) {
      const res = await deleteAccount(id);
      if (res.success) {
        showSuccess('کاربر با موفقیت حذف شد.');
        loadUsers();
      } else {
        showError(res.error || 'بروز خطا در حذف حساب کاربری.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center gap-2 text-sm">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl flex items-center gap-2 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile Settings (Admins/Managers editing themselves) */}
        <Card className="lg:col-span-4 p-6 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800 rounded-2xl relative shadow-md">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
            <User className="h-5 w-5 text-indigo-500" />
            <h4 className="font-bold text-slate-800 dark:text-slate-100">پروفایل کاربری من</h4>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="flex flex-col items-center justify-center py-3">
              <div className="relative group">
                {renderAvatarOffline(profileAvatar, profileName || 'من', 'w-20 h-20')}
                <label className="absolute inset-0 bg-black/50 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity duration-200">
                  آپلود عکس
                  <input type="file" accept="image/*" onChange={handleProfileImageUpload} className="hidden" />
                </label>
              </div>
              <p className="text-xs text-slate-400 mt-2 font-semibold">شناسه ورود: @{currentUser?.username}</p>
            </div>

            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1 block">نام و نام خانوادگی کامل</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  className="w-full p-2 border rounded-xl dark:bg-slate-900 border-slate-200 dark:border-slate-700" 
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1 block">تلفن تماس مستقیم</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={profilePhone}
                  onChange={e => setProfilePhone(e.target.value)}
                  className="w-full p-2 border rounded-xl dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-mono left-0 text-left" 
                />
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1 block">ایمیل آدرس</label>
              <div className="relative">
                <input 
                  type="email" 
                  value={profileEmail}
                  onChange={e => setProfileEmail(e.target.value)}
                  className="w-full p-2 border rounded-xl dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-mono left-0 text-left" 
                />
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50">
              <label className="text-xs text-amber-500 font-bold mb-1 block">تغییر رمز عبور (خالی بگذارید تا تغییر نکند)</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={profilePassword}
                  onChange={e => setProfilePassword(e.target.value)}
                  placeholder="رمز عبور کاربری جدید"
                  className="w-full p-2 border rounded-xl dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-mono text-left" 
                />
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
              ذخیره مشخصات پروفایل
            </Button>
          </form>
        </Card>

        {/* User Accounts list and Creator Panel */}
        <div className="lg:col-span-8 space-y-6">
          {/* Create New member / Edit Existing account */}
          <Card className="p-6 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800 rounded-2xl shadow-md">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
              <UserPlus className="h-5 w-5 text-indigo-500" />
              <h4 className="font-bold text-slate-800 dark:text-slate-100">
                {editingUserId ? "اصلاح و بروزرسانی مجوزهای پرسنل" : "معرفی همکار با دسترسی‌های متمایز و مجزا"}
              </h4>
            </div>

            {editingUserId ? (
              /* EDITING EXISTING ACCOUNT */
              <form onSubmit={handleSaveEditAccount} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold mb-1 block text-slate-500 dark:text-slate-400">نام همکار (اصلاح)</label>
                    <input 
                      type="text" 
                      value={editAccName} 
                      onChange={e => setEditAccName(e.target.value)}
                      className="w-full p-2 border rounded-xl dark:bg-slate-900 border-slate-200 dark:border-slate-700" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block text-slate-500 dark:text-slate-400">تغییر رمز عبور کاربر تیم (اختیاری)</label>
                    <input 
                      type="password" 
                      value={editAccPassword} 
                      placeholder="رمز جدید یا خالی"
                      onChange={e => setEditAccPassword(e.target.value)}
                      className="w-full p-2 border rounded-xl dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-mono" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block text-slate-500 dark:text-slate-400">شماره تماس (اصلاح)</label>
                    <input 
                      type="text" 
                      value={editAccPhone} 
                      onChange={e => setEditAccPhone(e.target.value)}
                      className="w-full p-2 border rounded-xl dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-left font-mono" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block text-slate-500 dark:text-slate-400">نقش سیستم</label>
                    <select
                      value={editAccRole}
                      onChange={e => setEditAccRole(e.target.value as UserRole)}
                      className="w-full p-2 border rounded-xl dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    >
                      <option value={UserRole.ADMIN}>مدیر ارشد (System Administrator)</option>
                      <option value={UserRole.LITHO_OPERATOR}>اپراتور رندر لیتوگرافی و تولید (Operator)</option>
                      <option value={UserRole.ACCOUNTANT}>حسابدار و مدیر خزانه (Accountant/ERP)</option>
                      <option value={UserRole.PARTNER}>شریک تجاری / مشتری سازمانی (Partner)</option>
                      <option value={UserRole.SMB}>نمایندگی خرد (Dealer/Reseller)</option>
                    </select>
                  </div>
                </div>

                {/* Selective Section Access Checklist */}
                <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                  <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                    <FolderLock className="h-4 w-4 text-violet-500" />
                    انتخاب بخش‌های مجاز برای بارگذاری و دسترسی همکار:
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {[
                      { key: 'crmDashboard', label: 'داشبورد کنترل و امور CRM' },
                      { key: 'treasuryAndLedger', label: 'خزانه‌داری، کیف‌پول و معین کارهای مالی' },
                      { key: 'inquiryRateSettings', label: 'فرمولاسیون و بورس کاغذ بلیتست' },
                      { key: 'cmsContentEditing', label: 'مدیریت محتوای سایت و وبلاگ (CMS)' },
                      { key: 'backupSystem', label: 'مانیتور بک آپ و مدیریت دیتابیس (DR)' },
                    ].map(perm => (
                      <button
                        type="button"
                        key={perm.key}
                        onClick={() => handleTogglePerm(perm.key as any, true)}
                        className={`flex items-center gap-2 p-2 border rounded-xl text-xs text-right font-medium transition ${
                          editAccPermissions[perm.key as keyof UserPermissions]
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                        }`}
                      >
                        {editAccPermissions[perm.key as keyof UserPermissions] ? (
                          <CheckSquare className="h-4 w-4 shrink-0 text-indigo-500" />
                        ) : (
                          <Square className="h-4 w-4 shrink-0" />
                        )}
                        <span>{perm.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                    ثبت تغییرات پرسنل
                  </Button>
                  <Button type="button" onClick={() => setEditingUserId(null)} className="bg-slate-700 hover:bg-slate-600 text-white">
                    انصراف
                  </Button>
                </div>
              </form>
            ) : (
              /* CREATING NEW ACCOUNT FORM */
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold mb-1 block text-slate-500 dark:text-slate-400">نام و نام خانوادگی همکار</label>
                    <input 
                      type="text" 
                      value={newAccName} 
                      onChange={e => setNewAccName(e.target.value)}
                      placeholder="مثال: عباس کریمی"
                      className="w-full p-2 border rounded-xl dark:bg-slate-900 border-slate-200 dark:border-slate-700" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block text-slate-500 dark:text-slate-400">نام کاربری جهت ورود (انگلیسی)</label>
                    <input 
                      type="text" 
                      value={newAccUsername} 
                      onChange={e => setNewAccUsername(e.target.value)}
                      placeholder="e.g. karimi_admin"
                      className="w-full p-2 border rounded-xl dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-mono text-left" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block text-slate-500 dark:text-slate-400">پسورد اولیه</label>
                    <input 
                      type="password" 
                      value={newAccPassword} 
                      onChange={e => setNewAccPassword(e.target.value)}
                      placeholder="پسورد موقت (پیش‌فرض ۱۲۳۴۵۶)"
                      className="w-full p-2 border rounded-xl dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-mono text-left" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block text-slate-500 dark:text-slate-400">تلفن تماس همکار</label>
                    <input 
                      type="text" 
                      value={newAccPhone} 
                      onChange={e => setNewAccPhone(e.target.value)}
                      placeholder="e.g. 09121111111"
                      className="w-full p-2 border rounded-xl dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-left font-mono" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block text-slate-500 dark:text-slate-400">نقش همکار در پلتفرم</label>
                    <select
                      value={newAccRole}
                      onChange={e => setNewAccRole(e.target.value as UserRole)}
                      className="w-full p-2 border rounded-xl dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    >
                      <option value={UserRole.ADMIN}>مدیر ارشد سیستم (System Administrator)</option>
                      <option value={UserRole.LITHO_OPERATOR}>اپراتور رندر لیتوگرافی (Operator)</option>
                      <option value={UserRole.ACCOUNTANT}>حسابدار و معین مالی مالی (Accountant/ERP)</option>
                      <option value={UserRole.PARTNER}>سازمان همکار بزرگ (Partner)</option>
                      <option value={UserRole.SMB}>فروش تکی نمایندگی (Reseller)</option>
                    </select>
                  </div>
                </div>

                {/* Selective Section Access Checklist */}
                <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                  <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                    <FolderLock className="h-4 w-4 text-violet-500" />
                    تخصیص اختیارات و مجوزهای همکار در پرتال:
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {[
                      { key: 'crmDashboard', label: 'داشبورد کنترل و امور CRM' },
                      { key: 'treasuryAndLedger', label: 'خزانه‌داری، کیف‌پول و معین کارهای مالی' },
                      { key: 'inquiryRateSettings', label: 'فرمولاسیون و بورس کاغذ بلیتست' },
                      { key: 'cmsContentEditing', label: 'مدیریت محتوای سایت و وبلاگ (CMS)' },
                      { key: 'backupSystem', label: 'مانیتور بک آپ و مدیریت دیتابیس (DR)' },
                    ].map(perm => (
                      <button
                        type="button"
                        key={perm.key}
                        onClick={() => handleTogglePerm(perm.key as any, false)}
                        className={`flex items-center gap-2 p-2 border rounded-xl text-xs text-right font-medium transition ${
                          newAccPermissions[perm.key as keyof UserPermissions]
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                        }`}
                      >
                        {newAccPermissions[perm.key as keyof UserPermissions] ? (
                          <CheckSquare className="h-4 w-4 shrink-0 text-indigo-500" />
                        ) : (
                          <Square className="h-4 w-4 shrink-0" />
                        )}
                        <span>{perm.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                  درج حساب همکار و ابلاغ پسورد ورود
                </Button>
              </form>
            )}
          </Card>

          {/* Members List Directory */}
          <Card className="p-6 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800 rounded-2xl shadow-md">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-indigo-500" />
              فهرست نیروی کار و دسترسی مدیران ارشد سیستم
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {users.map(u => (
                <div key={u.id} className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      {renderAvatarOffline(u.avatar, u.name, 'w-10 h-10 text-[10px]')}
                      <div>
                        <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100">{u.name}</h5>
                        <span className="text-[10px] text-slate-400 font-mono">@{u.username}</span>
                      </div>
                    </div>

                    <div className="space-y-1 mt-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">سمت دسترسی:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{u.role}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">شماره موبایل:</span>
                        <span className="font-mono text-slate-600 dark:text-slate-300">{u.phone || '---'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">تاریخ ثبت نام:</span>
                        <span>{u.joinDate || '---'}</span>
                      </div>
                    </div>

                    {/* Permissions list Badges */}
                    <div className="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800 flex flex-wrap gap-1">
                      {u.permissions ? (
                        Object.keys(u.permissions).map(permKey => {
                          const hasPerm = u.permissions[permKey];
                          const label = 
                            permKey === 'crmDashboard' ? 'امور مشتریان' :
                            permKey === 'treasuryAndLedger' ? 'خزانه مالی' :
                            permKey === 'inquiryRateSettings' ? 'تنظیمات سود' :
                            permKey === 'cmsContentEditing' ? 'صفحات وبلاگ' :
                            permKey === 'backupSystem' ? 'بکاپ دیتابیس' : permKey;
                          return hasPerm ? (
                            <span key={permKey} className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded">
                              {label}
                            </span>
                          ) : null;
                        })
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">دسترسی نامحدود دارد</span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800">
                    <button
                      onClick={() => handleStartEdit(u)}
                      className="p-1 px-2.5 rounded-lg text-[11px] font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 flex items-center gap-1 transition"
                    >
                      <Edit className="h-3 w-3" />
                      ویرایش دسترسی
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(u.id, u.name)}
                      disabled={currentUser?.id === u.id}
                      className={`p-1 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
                        currentUser?.id === u.id 
                          ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      <Trash className="h-3 w-3" />
                      حذف حساب
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
