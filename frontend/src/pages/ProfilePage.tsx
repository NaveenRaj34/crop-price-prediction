import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { authApi } from '@/api/services';

const profileSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  display_name: z.string().optional(),
  preferred_state: z.string().optional(),
  preferred_district: z.string().optional(),
  phone_number: z.string().optional(),
  bio: z.string().max(500).optional(),
});

const passwordSchema = z.object({
  old_password: z.string().min(1, 'Current password required'),
  new_password: z.string().min(8, 'Min 8 characters'),
  new_password2: z.string(),
}).refine(d => d.new_password === d.new_password2, { message: 'Passwords do not match', path: ['new_password2'] });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const [passErr, setPassErr] = useState('');

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      email: user?.email ?? '',
      display_name: user?.profile?.display_name ?? '',
      preferred_state: user?.profile?.preferred_state ?? '',
      preferred_district: user?.profile?.preferred_district ?? '',
      phone_number: user?.profile?.phone_number ?? '',
      bio: user?.profile?.bio ?? '',
    },
  });

  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const onSaveProfile = async (data: ProfileForm) => {
    setProfileMsg(''); setProfileErr('');
    try {
      await authApi.updateProfile({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        profile: {
          display_name: data.display_name,
          preferred_state: data.preferred_state,
          preferred_district: data.preferred_district,
          phone_number: data.phone_number,
          bio: data.bio,
        },
      });
      await refreshUser();
      setProfileMsg('Profile updated successfully.');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setProfileErr(e?.response?.data?.error?.message ?? 'Update failed.');
    }
  };

  const onChangePassword = async (data: PasswordForm) => {
    setPassMsg(''); setPassErr('');
    try {
      await authApi.changePassword(data.old_password, data.new_password, data.new_password2);
      setPassMsg('Password changed successfully.');
      passwordForm.reset();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setPassErr(e?.response?.data?.error?.message ?? 'Password change failed.');
    }
  };

  return (
    <div className="page-container animate-fade-in max-w-2xl">
      <h1 className="mb-6">Profile & Settings</h1>

      {/* Profile form */}
      <div className="card p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <User className="w-4 h-4 text-primary-600" /> Personal Information
        </h3>
        <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">First Name</label>
              <input type="text" className="input" {...profileForm.register('first_name')} />
            </div>
            <div className="form-group">
              <label className="label">Last Name</label>
              <input type="text" className="input" {...profileForm.register('last_name')} />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Email</label>
            <input type="email" className="input" {...profileForm.register('email')} />
          </div>
          <div className="form-group">
            <label className="label">Display Name</label>
            <input type="text" className="input" placeholder="How your name appears in the app" {...profileForm.register('display_name')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Preferred State</label>
              <input type="text" className="input" placeholder="e.g. Tamil Nadu" {...profileForm.register('preferred_state')} />
            </div>
            <div className="form-group">
              <label className="label">Preferred District</label>
              <input type="text" className="input" placeholder="e.g. Coimbatore" {...profileForm.register('preferred_district')} />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Phone Number</label>
            <input type="tel" className="input" {...profileForm.register('phone_number')} />
          </div>
          <div className="form-group">
            <label className="label">Bio <span className="text-gray-400 text-xs">(max 500 chars)</span></label>
            <textarea className="input h-20 resize-none" {...profileForm.register('bio')} />
          </div>

          {profileMsg && <div className="flex items-center gap-2 text-sm text-green-700"><CheckCircle className="w-4 h-4" />{profileMsg}</div>}
          {profileErr && <div className="flex items-center gap-2 text-sm text-red-600"><AlertCircle className="w-4 h-4" />{profileErr}</div>}

          <button type="submit" disabled={profileForm.formState.isSubmitting} className="btn-primary">
            {profileForm.formState.isSubmitting ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Password form */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary-600" /> Change Password
        </h3>
        <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
          <div className="form-group">
            <label className="label">Current Password</label>
            <input type="password" className="input" {...passwordForm.register('old_password')} />
            {passwordForm.formState.errors.old_password && <p className="error-msg">{passwordForm.formState.errors.old_password.message}</p>}
          </div>
          <div className="form-group">
            <label className="label">New Password</label>
            <input type="password" className="input" placeholder="Min. 8 characters" {...passwordForm.register('new_password')} />
            {passwordForm.formState.errors.new_password && <p className="error-msg">{passwordForm.formState.errors.new_password.message}</p>}
          </div>
          <div className="form-group">
            <label className="label">Confirm New Password</label>
            <input type="password" className="input" {...passwordForm.register('new_password2')} />
            {passwordForm.formState.errors.new_password2 && <p className="error-msg">{passwordForm.formState.errors.new_password2.message}</p>}
          </div>

          {passMsg && <div className="flex items-center gap-2 text-sm text-green-700"><CheckCircle className="w-4 h-4" />{passMsg}</div>}
          {passErr && <div className="flex items-center gap-2 text-sm text-red-600"><AlertCircle className="w-4 h-4" />{passErr}</div>}

          <button type="submit" disabled={passwordForm.formState.isSubmitting} className="btn-primary">
            {passwordForm.formState.isSubmitting ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
