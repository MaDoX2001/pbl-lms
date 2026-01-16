import React from 'react';
import TeacherProfileView from './TeacherProfileView';

const AdminProfileView = ({ user }) => {
  return (
    <div className="space-y-6">
      {/* Admin Badge */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-4">
          <div className="bg-white bg-opacity-20 rounded-full p-4">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-1">صلاحيات المسؤول</h2>
            <p className="opacity-90">لديك إمكانية الوصول الكامل لجميع ميزات النظام</p>
          </div>
        </div>
      </div>

      {/* Admin Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>⚡</span>
          إجراءات المسؤول
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminActionCard
            icon="👥"
            title="إدارة المستخدمين"
            description="عرض وإدارة جميع المستخدمين"
            onClick={() => window.location.href = '/admin'}
            color="bg-blue-500"
          />
          <AdminActionCard
            icon="✉️"
            title="الدعوات"
            description="إرسال دعوات للمستخدمين الجدد"
            onClick={() => window.location.href = '/admin'}
            color="bg-green-500"
          />
          <AdminActionCard
            icon="📊"
            title="الإحصائيات"
            description="عرض إحصائيات النظام"
            onClick={() => window.location.href = '/admin'}
            color="bg-purple-500"
          />
          <AdminActionCard
            icon="⚙️"
            title="الإعدادات"
            description="إعدادات النظام العامة"
            onClick={() => window.location.href = '/admin'}
            color="bg-orange-500"
          />
        </div>
      </div>

      {/* Teacher Profile Content */}
      <div className="border-t-4 border-gray-200 pt-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-700">ملف المعلم</h2>
        <TeacherProfileView user={user} />
      </div>
    </div>
  );
};

const AdminActionCard = ({ icon, title, description, onClick, color }) => (
  <button
    onClick={onClick}
    className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-xl hover:border-gray-300 transition-all text-right"
  >
    <div className={`${color} w-12 h-12 rounded-lg flex items-center justify-center text-2xl mb-4`}>
      {icon}
    </div>
    <h3 className="font-bold text-lg mb-2">{title}</h3>
    <p className="text-sm text-gray-600">{description}</p>
  </button>
);

export default AdminProfileView;
