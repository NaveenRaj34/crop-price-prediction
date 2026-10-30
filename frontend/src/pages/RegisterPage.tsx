import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Leaf, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';

const schema = z.object({
  username: z.string().min(3, 'At least 3 characters').max(50),
  email: z.string().email('Valid email required'),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  display_name: z.string().optional(),
  password: z.string().min(8, 'At least 8 characters'),
  password2: z.string(),
}).refine(d => d.password === d.password2, { message: 'Passwords do not match', path: ['password2'] });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [apiError, setApiError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setApiError('');
    try {
      // Register then immediately log in using the auth context
      const { authApi } = await import('@/api/services');
      const res = await authApi.register(data);
      // Store tokens returned from registration
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      // Reload auth state
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setApiError(e?.response?.data?.error?.message ?? 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 to-forest-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">CropCast</span>
          </Link>
          <p className="text-primary-300 mt-2 text-sm">Create your account</p>
        </div>

        <div className="card p-8 shadow-xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="first_name" className="label">First Name</label>
                <input id="first_name" type="text" className="input" placeholder="John" {...register('first_name')} />
              </div>
              <div className="form-group">
                <label htmlFor="last_name" className="label">Last Name</label>
                <input id="last_name" type="text" className="input" placeholder="Doe" {...register('last_name')} />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="username" className="label">Username <span className="text-red-500">*</span></label>
              <input id="username" type="text" autoComplete="username" className="input"
                placeholder="farmer_john" {...register('username')} />
              {errors.username && <p className="error-msg"><AlertCircle className="w-3.5 h-3.5" />{errors.username.message}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="email" className="label">Email <span className="text-red-500">*</span></label>
              <input id="email" type="email" autoComplete="email" className="input"
                placeholder="you@example.com" {...register('email')} />
              {errors.email && <p className="error-msg"><AlertCircle className="w-3.5 h-3.5" />{errors.email.message}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="label">Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input id="password" type={showPass ? 'text' : 'password'} autoComplete="new-password"
                  className="input pr-10" placeholder="Min. 8 characters" {...register('password')} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="error-msg"><AlertCircle className="w-3.5 h-3.5" />{errors.password.message}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="password2" className="label">Confirm Password <span className="text-red-500">*</span></label>
              <input id="password2" type={showPass ? 'text' : 'password'} autoComplete="new-password"
                className="input" placeholder="Repeat password" {...register('password2')} />
              {errors.password2 && <p className="error-msg"><AlertCircle className="w-3.5 h-3.5" />{errors.password2.message}</p>}
            </div>

            {apiError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{apiError}</p>
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-2">
              {isSubmitting ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
