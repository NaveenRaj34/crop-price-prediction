import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Leaf, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';
  const [showPass, setShowPass] = useState(false);
  const [apiError, setApiError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setApiError('');
    try {
      await login(data.username, data.password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setApiError(e?.response?.data?.error?.message ?? 'Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 to-forest-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">CropCast</span>
          </Link>
          <p className="text-primary-300 mt-2 text-sm">Sign in to your account</p>
        </div>

        <div className="card p-8 shadow-xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="form-group">
              <label htmlFor="username" className="label">Username</label>
              <input id="username" type="text" autoComplete="username"
                className="input" placeholder="your_username" {...register('username')} />
              {errors.username && <p className="error-msg"><AlertCircle className="w-3.5 h-3.5" />{errors.username.message}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <input id="password" type={showPass ? 'text' : 'password'}
                  autoComplete="current-password" className="input pr-10"
                  placeholder="••••••••" {...register('password')} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="error-msg"><AlertCircle className="w-3.5 h-3.5" />{errors.password.message}</p>}
            </div>

            {apiError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{apiError}</p>
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 font-medium hover:underline">Create one</Link>
          </p>
        </div>

        <p className="text-center text-xs text-primary-400 mt-6">
          <Link to="/" className="hover:text-primary-200">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
