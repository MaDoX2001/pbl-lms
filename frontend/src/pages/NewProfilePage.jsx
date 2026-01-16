import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { getMyProfile } from '../services/userService';
import ProfileHeader from '../components/profile/ProfileHeader';
import SecurityTab from '../components/profile/SecurityTab';

const NewProfilePage = () => {
  const { user: authUser } = useSelector((state) => state.auth);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-600">لم يتم العثور على بيانات المستخدم</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <ProfileHeader user={user} onEdit={handleEditProfile} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {user.role === 'student' ? (
          <>
            <StatCard
              title="المستوى"
              value={user.level || 1}
              icon="📊"
              color="blue"
            />
            <StatCard
              title="النقاط"
              value={user.points || 0}
              icon="⭐"
              color="yellow"
            />
            <StatCard
              title="المشاريع المكتملة"
              value={user.completedProjects?.length || 0}
              icon="✅"
              color="green"
            />
            <StatCard
              title="المشاريع الحالية"
              value={user.enrolledProjects?.length || 0}
              icon="📁"
              color="purple"
            />
          </>
        ) : (
          <>
            <StatCard
              title="المشاريع المُنشأة"
              value={user.createdProjects?.length || 0}
              icon="📂"
              color="indigo"
            />
            <StatCard
              title="الطلاب"
              value={user.studentsCount || 0}
              icon="👥"
              color="teal"
            />
            <StatCard
              title="الواجبات"
              value={user.assignmentsCount || 0}
              icon="📝"
              color="orange"
            />
            <StatCard
              title="متوسط الإنجاز"
              value={`${user.avgCompletion || 0}%`}
              icon="📈"
              color="pink"
            />
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex gap-4 px-6" aria-label="Tabs">
            <TabButton
              label="نظرة عامة"
              icon="📊"
              active={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
            />
            {user.role === 'student' && (
              <>
                <TabButton
                  label="مشاريعي"
                  icon="📁"
                  active={activeTab === 'projects'}
                  onClick={() => setActiveTab('projects')}
                />
                <TabButton
                  label="الدرجات"
                  icon="📝"
                  active={activeTab === 'grades'}
                  onClick={() => setActiveTab('grades')}
                />
              </>
            )}
            {(user.role === 'teacher' || user.role === 'admin') && (
              <>
                <TabButton
                  label="مشاريعي"
                  icon="📂"
                  active={activeTab === 'projects'}
                  onClick={() => setActiveTab('projects')}
                />
                <TabButton
                  label="الطلاب"
                  icon="👥"
                  active={activeTab === 'students'}
                  onClick={() => setActiveTab('students')}
                />
              </>
            )}
            <TabButton
              label="الأمان"
              icon="🔒"
              active={activeTab === 'security'}
              onClick={() => setActiveTab('security')}
            />
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && <OverviewTab user={user} />}
          {activeTab === 'projects' && <ProjectsTab user={user} />}
          {activeTab === 'grades' && user.role === 'student' && <GradesTab user={user} />}
          {activeTab === 'students' && (user.role === 'teacher' || user.role === 'admin') && <StudentsTab user={user} />}
          {activeTab === 'security' && <SecurityTab />}
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    teal: 'bg-teal-50 text-teal-600',
    orange: 'bg-orange-50 text-orange-600',
    pink: 'bg-pink-50 text-pink-600'
  };

  return (
    <div className={`${colors[color]} rounded-lg p-6 shadow-sm`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <span className="text-4xl opacity-70">{icon}</span>
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
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    <span>{icon}</span>
    {label}
  </button>
);

// Overview Tab
const OverviewTab = ({ user }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-bold mb-4">معلومات الحساب</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoItem label="الاسم" value={user.name} />
        <InfoItem label="البريد الإلكتروني" value={user.email} />
        <InfoItem label="الدور" value={user.role === 'student' ? 'طالب' : user.role === 'teacher' ? 'معلم' : 'مسؤول'} />
        <InfoItem label="حالة التفعيل" value={user.isEmailVerified ? '✅ مفعّل' : '❌ غير مفعّل'} />
      </div>
    </div>

    {user.bio && (
      <div>
        <h3 className="text-lg font-bold mb-2">النبذة الشخصية</h3>
        <p className="text-gray-700">{user.bio}</p>
      </div>
    )}

    {user.skills && user.skills.length > 0 && (
      <div>
        <h3 className="text-lg font-bold mb-2">المهارات</h3>
        <div className="flex flex-wrap gap-2">
          {user.skills.map((skill, index) => (
            <span key={index} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
              {skill}
            </span>
          ))}
        </div>
      </div>
    )}
  </div>
);

// Info Item Component
const InfoItem = ({ label, value }) => (
  <div className="border border-gray-200 rounded-lg p-4">
    <p className="text-sm text-gray-500 mb-1">{label}</p>
    <p className="font-semibold text-gray-900">{value}</p>
  </div>
);

// Projects Tab
const ProjectsTab = ({ user }) => {
  const projects = user.role === 'student' 
    ? [...(user.enrolledProjects || []), ...(user.completedProjects || [])]
    : (user.createdProjects || []);

  if (projects.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">لا توجد مشاريع حالياً</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <div key={project._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          {project.coverImage && (
            <img src={project.coverImage} alt={project.title} className="w-full h-32 object-cover rounded-lg mb-3" />
          )}
          <h4 className="font-bold text-lg mb-2">{project.title}</h4>
          {project.difficulty && (
            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
              project.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
              project.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {project.difficulty === 'beginner' ? 'مبتدئ' : project.difficulty === 'intermediate' ? 'متوسط' : 'متقدم'}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

// Grades Tab (Student only)
const GradesTab = ({ user }) => (
  <div className="text-center py-12 text-gray-500">
    <p className="text-lg">قريباً: عرض الدرجات والتقييمات</p>
  </div>
);

// Students Tab (Teacher/Admin only)
const StudentsTab = ({ user }) => (
  <div className="text-center py-12 text-gray-500">
    <p className="text-lg">قريباً: قائمة الطلاب وإدارتهم</p>
  </div>
);

export default NewProfilePage;
