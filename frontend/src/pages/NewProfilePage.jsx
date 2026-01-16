import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getMyProfile } from '../services/userService';
import ProfileHeader from '../components/profile/ProfileHeader';
import StudentProfileView from '../components/profile/StudentProfileView';
import TeacherProfileView from '../components/profile/TeacherProfileView';
import AdminProfileView from '../components/profile/AdminProfileView';
import SecurityTab from '../components/profile/SecurityTab';

const NewProfilePage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await getMyProfile();
      setUser(response.data);
    } catch (error) {
      toast.error('فشل تحميل بيانات الملف الشخصي');
      console.error('Profile fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    toast.info('قريباً: صفحة تعديل الملف الشخصي');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600"></div>
          <p className="text-gray-600 text-lg">جاري تحميل الملف الشخصي...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <svg className="w-24 h-24 mx-auto mb-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-gray-600 text-lg">لم يتم العثور على بيانات المستخدم</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Profile Card */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        {/* Header Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-6 flex-wrap">
            {/* Avatar with Completion Badge */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-gray-500">
                    {user.name?.charAt(0)?.toUpperCase()}
                  </span>
                )}
              </div>
              {/* Completion Badge */}
              <div className="absolute -bottom-1 -right-1 bg-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-xs font-bold border-2 border-white shadow-lg">
                {user.profileCompletion || 0}%
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-gray-800">{user.name}</h1>
                {user.isEmailVerified && (
                  <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  user.role === 'student' ? 'bg-blue-100 text-blue-700' :
                  user.role === 'teacher' ? 'bg-green-100 text-green-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {user.role === 'student' ? '👨‍🎓 طالب' : user.role === 'teacher' ? '👨‍🏫 معلم' : '👨‍💼 مسؤول'}
                </span>
                {user.twoFactorEnabled && (
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700">
                    🔒 2FA مفعل
                  </span>
                )}
              </div>

              <p className="text-gray-600 text-sm">{user.email}</p>
            </div>

            {/* Edit Button */}
            <button
              onClick={handleEditProfile}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              تعديل الملف
            </button>
          </div>

          {/* Profile Completion Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">اكتمال الملف الشخصي</span>
              <span className="font-semibold text-gray-700">{user.profileCompletion || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${user.profileCompletion || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-1 px-6 overflow-x-auto" aria-label="Tabs">
            <TabButton
              label="نظرة عامة"
              icon="📊"
              active={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
            />
            <TabButton
              label="النشاط"
              icon="⚡"
              active={activeTab === 'activity'}
              onClick={() => setActiveTab('activity')}
            />
            <TabButton
              label="الإعدادات"
              icon="⚙️"
              active={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
            />
            <TabButton
              label="الأمان"
              icon="🔒"
              active={activeTab === 'security'}
              onClick={() => setActiveTab('security')}
            />
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && <OverviewTab user={user} />}
          {activeTab === 'activity' && <ActivityTab user={user} />}
          {activeTab === 'settings' && <SettingsTab user={user} />}
          {activeTab === 'security' && <SecurityTab />}
        </div>
      </div>
    </div>
  );
};

// Tab Button Component
const TabButton = ({ label, icon, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
      active
        ? 'border-purple-600 text-purple-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`}
  >
    <span>{icon}</span>
    {label}
  </button>
);

// Overview Tab - Role-based rendering
const OverviewTab = ({ user }) => {
  if (user.role === 'admin') {
    return <AdminProfileView user={user} />;
  } else if (user.role === 'teacher') {
    return <TeacherProfileView user={user} />;
  } else {
    return <StudentProfileView user={user} />;
  }
};

// Activity Tab
const ActivityTab = ({ user }) => (
  <div className="bg-white rounded-xl p-6">
    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
      <span>⚡</span>
      النشاط الأخير
    </h2>
    <div className="text-center py-12 text-gray-400">
      <span className="text-6xl mb-4 block">📋</span>
      <p className="text-lg">قريباً: عرض النشاط الأخير والإشعارات</p>
    </div>
  </div>
);

// Settings Tab
const SettingsTab = ({ user }) => (
  <div className="space-y-6">
    <div className="bg-white rounded-xl p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span>👤</span>
        معلومات الحساب
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InfoField label="الاسم الكامل" value={user.name} />
        <InfoField label="البريد الإلكتروني" value={user.email} />
        <InfoField label="الدور" value={
          user.role === 'student' ? 'طالب' :
          user.role === 'teacher' ? 'معلم' : 'مسؤول'
        } />
        <InfoField label="حالة التفعيل" value={
          user.isEmailVerified ? '✅ مفعّل' : '❌ غير مفعّل'
        } />
        <InfoField label="المصادقة الثنائية" value={
          user.twoFactorEnabled ? '✅ مفعّلة' : '❌ غير مفعّلة'
        } />
        <InfoField label="تاريخ الانضمام" value={
          user.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-EG') : '-'
        } />
      </div>
    </div>

    {user.bio && (
      <div className="bg-white rounded-xl p-6">
        <h3 className="text-xl font-bold mb-4">النبذة الشخصية</h3>
        <p className="text-gray-700 leading-relaxed">{user.bio}</p>
      </div>
    )}

    {user.skills && user.skills.length > 0 && (
      <div className="bg-white rounded-xl p-6">
        <h3 className="text-xl font-bold mb-4">المهارات</h3>
        <div className="flex flex-wrap gap-3">
          {user.skills.map((skill, index) => (
            <span
              key={index}
              className="bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    )}

    {/* Edit Profile Info */}
    <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6">
      <div className="flex items-start gap-4">
        <svg className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <div>
          <h4 className="font-bold text-blue-900 mb-1">تحديث المعلومات</h4>
          <p className="text-blue-800 text-sm">
            استخدم زر "تعديل الملف الشخصي" في الأعلى لتحديث معلوماتك الشخصية والصورة الرمزية
          </p>
        </div>
      </div>
    </div>
  </div>
);

const InfoField = ({ label, value }) => (
  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
    <p className="text-sm text-gray-500 mb-1 font-medium">{label}</p>
    <p className="font-semibold text-gray-900 text-lg">{value || '-'}</p>
  </div>
);

export default NewProfilePage;
