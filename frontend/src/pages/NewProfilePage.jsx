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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Profile Header - Centered */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <div className="flex flex-col items-center text-center">
            {/* Large Centered Avatar */}
            <div className="relative mb-4">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center border-4 border-white shadow-lg">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl font-bold text-white">
                    {user.name?.charAt(0)?.toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Name with Verification Badge */}
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
              {user.isEmailVerified && (
                <svg className="w-7 h-7 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>

            {/* Email */}
            <p className="text-gray-600 mb-4">{user.email}</p>
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Personal Details */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal details</h2>
              <div className="space-y-4">
                <DetailRow label="Full name:" value={user.name} />
                <DetailRow label="Date of Birth:" value={user.dateOfBirth || 'January 1, 1987'} />
                <DetailRow label="Gender:" value={user.gender || 'Male'} />
                <DetailRow label="Nationality:" value={user.nationality || 'American'} />
                <DetailRow label="Address:" value={user.address || 'California - United States'} icon="🇺🇸" />
                <DetailRow label="Phone Number:" value={user.phoneNumber || '(213) 555-1234'} />
                <DetailRow label="Email:" value={user.email} />
              </div>
            </div>

            {/* Security Settings */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h2>
              <div className="space-y-4">
                <DetailRow label="Password Last Changed:" value="July 15, 2024" />
                <DetailRow label="Two-Factor Authentication:" value={user.twoFactorEnabled ? 'Enabled' : 'Disabled'} badge={user.twoFactorEnabled ? 'Enabled' : null} badgeColor="blue" />
                <DetailRow label="Security Questions Set:" value="Yes" />
                <DetailRow label="Login Notifications:" value="Enabled" badge="Enabled" badgeColor="blue" />
                <DetailRow label="Connected Devices:" value="3 Devices" />
                <DetailRow label="Recent Account Activity:" value="No Suspicious Activity Detected" />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Account Details */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h2>
              <div className="space-y-4">
                <DetailRow label="Display Name:" value={`s.${user.name?.toLowerCase().replace(/\s+/g, '.')}.168920`} />
                <DetailRow label="Account Created:" value={new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />
                <DetailRow label="Last Login:" value={user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'August 22, 2024'} />
                <DetailRow label="Membership Status:" value={user.membershipStatus || 'Premium Member'} />
                <DetailRow label="Account Verification:" value="Verified" badge="Verified" badgeColor="green" />
                <DetailRow label="Language Preference:" value="English" />
                <DetailRow label="Time Zone:" value="GMT-5 (Eastern Time)" />
              </div>
            </div>

            {/* Preferences */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h2>
              <div className="space-y-4">
                <DetailRow label="Email Notifications:" value="Subscribed" badge="Subscribed" badgeColor="purple" />
                <DetailRow label="SMS Alerts:" value="Enabled" badge="Enabled" badgeColor="blue" />
                <DetailRow label="Content Preferences:" value="Technology, Design, Innovation" />
                <DetailRow label="Default Dashboard View:" value="Compact Mode" />
                <DetailRow label="Dark Mode:" value="Activated" />
                <DetailRow label="Language for Content:" value="English" />
              </div>
            </div>
          </div>
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
