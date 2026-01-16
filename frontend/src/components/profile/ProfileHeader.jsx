import React from 'react';
import { calculateProfileCompletion } from '../../services/userService';

const ProfileHeader = ({ user, onEdit }) => {
  const getRoleBadge = (role) => {
    const badges = {
      student: { text: 'طالب', color: 'bg-blue-500' },
      teacher: { text: 'معلم', color: 'bg-green-500' },
      admin: { text: 'مسؤول', color: 'bg-orange-500' }
    };
    return badges[role] || badges.student;
  };

  const badge = getRoleBadge(user.role);
  const profileCompletion = calculateProfileCompletion(user);

  return (
    <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg shadow-lg p-6 mb-6 text-white">
      <div className="flex items-center gap-6 flex-wrap">
        {/* Avatar */}
        <div className="relative">
          <div className="w-28 h-28 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white flex items-center justify-center">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-purple-600">
                {user.name?.charAt(0)?.toUpperCase()}
              </span>
            )}
          </div>
          {/* Profile Completion Badge */}
          <div className="absolute -bottom-2 -right-2 bg-white text-purple-600 rounded-full w-12 h-12 flex items-center justify-center shadow-lg border-2 border-purple-600">
            <span className="text-xs font-bold">{profileCompletion}%</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-[250px]">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{user.name}</h1>
            {user.isEmailVerified && (
              <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className={`${badge.color} px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2`}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
              </svg>
              {badge.text}
            </span>
            {user.twoFactorEnabled && (
              <span className="bg-green-500 px-3 py-1 rounded-full text-sm font-bold">
                🔒 2FA
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 opacity-90">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            <span>{user.email}</span>
          </div>

          {/* Profile Completion Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>اكتمال الملف الشخصي</span>
              <span>{profileCompletion}%</span>
            </div>
            <div className="w-full bg-white bg-opacity-30 rounded-full h-2 overflow-hidden">
              <div
                className="bg-white h-full transition-all duration-500"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
          </div>
        </div>

        {/* Edit Button */}
        {onEdit && (
          <button
            onClick={onEdit}
            className="bg-white text-purple-600 px-6 py-3 rounded-lg font-bold hover:bg-opacity-90 transition-all flex items-center gap-2 shadow-lg"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            تعديل الملف الشخصي
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;
