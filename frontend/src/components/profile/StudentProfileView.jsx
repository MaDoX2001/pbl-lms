import React from 'react';

const StudentProfileView = ({ user }) => {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="المستوى"
          value={user.level || 1}
          icon="📊"
          bgColor="bg-gradient-to-br from-blue-50 to-blue-100"
          textColor="text-blue-600"
        />
        <StatCard
          title="النقاط"
          value={user.points || 0}
          icon="⭐"
          bgColor="bg-gradient-to-br from-yellow-50 to-yellow-100"
          textColor="text-yellow-600"
        />
        <StatCard
          title="المشاريع المكتملة"
          value={user.completedProjects?.length || 0}
          icon="✅"
          bgColor="bg-gradient-to-br from-green-50 to-green-100"
          textColor="text-green-600"
        />
        <StatCard
          title="المشاريع الحالية"
          value={user.enrolledProjects?.length || 0}
          icon="📁"
          bgColor="bg-gradient-to-br from-purple-50 to-purple-100"
          textColor="text-purple-600"
        />
      </div>

      {/* Projects Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span>📚</span>
          مشاريعي
        </h2>
        
        {user.enrolledProjects && user.enrolledProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {user.enrolledProjects.map((project) => (
              <ProjectCard key={project._id} project={project} status="active" />
            ))}
          </div>
        ) : (
          <EmptyState message="لم تنضم لأي مشروع بعد" icon="📂" />
        )}
      </div>

      {/* Completed Projects */}
      {user.completedProjects && user.completedProjects.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <span>🎓</span>
            المشاريع المكتملة
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {user.completedProjects.map((project) => (
              <ProjectCard key={project._id} project={project} status="completed" />
            ))}
          </div>
        </div>
      )}
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

const ProjectCard = ({ project, status }) => (
  <div className="border-2 border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer">
    {project.coverImage && (
      <img
        src={project.coverImage}
        alt={project.title}
        className="w-full h-32 object-cover rounded-lg mb-3"
      />
    )}
    <h4 className="font-bold text-lg mb-2 line-clamp-2">{project.title}</h4>
    <div className="flex items-center justify-between">
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
        status === 'completed'
          ? 'bg-green-100 text-green-700'
          : 'bg-blue-100 text-blue-700'
      }`}>
        {status === 'completed' ? 'مكتمل' : 'نشط'}
      </span>
      {project.difficulty && (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
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
  </div>
);

const EmptyState = ({ message, icon }) => (
  <div className="text-center py-12 text-gray-400">
    <span className="text-6xl mb-4 block">{icon}</span>
    <p className="text-lg">{message}</p>
  </div>
);

export default StudentProfileView;
