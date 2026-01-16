import React from 'react';

const TeacherProfileView = ({ user }) => {
  // Mock data for demonstration - in production, fetch from backend
  const stats = {
    createdProjects: user.createdProjects?.length || 0,
    totalStudents: user.studentsCount || 0,
    activeAssignments: user.assignmentsCount || 0,
    avgCompletion: user.avgCompletion || 0
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="المشاريع المُنشأة"
          value={stats.createdProjects}
          icon="📂"
          bgColor="bg-gradient-to-br from-indigo-50 to-indigo-100"
          textColor="text-indigo-600"
        />
        <StatCard
          title="إجمالي الطلاب"
          value={stats.totalStudents}
          icon="👥"
          bgColor="bg-gradient-to-br from-teal-50 to-teal-100"
          textColor="text-teal-600"
        />
        <StatCard
          title="الواجبات النشطة"
          value={stats.activeAssignments}
          icon="📝"
          bgColor="bg-gradient-to-br from-orange-50 to-orange-100"
          textColor="text-orange-600"
        />
        <StatCard
          title="متوسط الإنجاز"
          value={`${stats.avgCompletion}%`}
          icon="📈"
          bgColor="bg-gradient-to-br from-pink-50 to-pink-100"
          textColor="text-pink-600"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold mb-4">إجراءات سريعة</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionButton
            icon="➕"
            label="إنشاء مشروع جديد"
            onClick={() => window.location.href = '/create-project'}
            color="bg-purple-600 hover:bg-purple-700"
          />
          <QuickActionButton
            icon="📊"
            label="عرض لوحة المتصدرين"
            onClick={() => window.location.href = '/leaderboard'}
            color="bg-blue-600 hover:bg-blue-700"
          />
          <QuickActionButton
            icon="👥"
            label="إدارة الطلاب"
            onClick={() => alert('قريباً: إدارة الطلاب')}
            color="bg-green-600 hover:bg-green-700"
          />
        </div>
      </div>

      {/* Created Projects */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span>📚</span>
          مشاريعي
        </h2>
        
        {user.createdProjects && user.createdProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {user.createdProjects.map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
          </div>
        ) : (
          <EmptyState message="لم تقم بإنشاء أي مشروع بعد" icon="📂" />
        )}
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <svg className="w-8 h-8 text-blue-500 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="text-lg font-bold text-blue-900 mb-2">معلومة</h3>
            <p className="text-blue-800 leading-relaxed">
              يمكنك إنشاء مشاريع جديدة وإدارة الواجبات وتتبع تقدم الطلاب من خلال لوحة التحكم. استخدم الإجراءات السريعة أعلاه للوصول السريع.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, bgColor, textColor }) => (
  <div className={`${bgColor} rounded-xl p-6 shadow-sm border border-gray-100`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <p className={`text-4xl font-bold ${textColor}`}>{value}</p>
      </div>
      <span className="text-5xl opacity-70">{icon}</span>
    </div>
  </div>
);

const QuickActionButton = ({ icon, label, onClick, color }) => (
  <button
    onClick={onClick}
    className={`${color} text-white px-6 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center gap-3`}
  >
    <span className="text-2xl">{icon}</span>
    <span>{label}</span>
  </button>
);

const ProjectCard = ({ project }) => (
  <div className="border-2 border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer">
    {project.coverImage && (
      <img
        src={project.coverImage}
        alt={project.title}
        className="w-full h-32 object-cover rounded-lg mb-3"
      />
    )}
    <h4 className="font-bold text-lg mb-2 line-clamp-2">{project.title}</h4>
    {project.difficulty && (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
        project.difficulty === 'beginner'
          ? 'bg-green-100 text-green-700'
          : project.difficulty === 'intermediate'
          ? 'bg-yellow-100 text-yellow-700'
          : 'bg-red-100 text-red-700'
      }`}>
        {project.difficulty === 'beginner' ? 'مبتدئ' : project.difficulty === 'intermediate' ? 'متوسط' : 'متقدم'}
      </span>
    )}
  </div>
);

const EmptyState = ({ message, icon }) => (
  <div className="text-center py-12 text-gray-400">
    <span className="text-6xl mb-4 block">{icon}</span>
    <p className="text-lg">{message}</p>
  </div>
);

export default TeacherProfileView;
