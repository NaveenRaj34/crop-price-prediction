import { Link } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-gray-400" />
        </div>
        <h1 className="text-6xl font-extrabold text-gray-900 mb-3">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
        <p className="text-gray-500 mb-8">The page you are looking for does not exist or has been moved.</p>
        <Link to="/" className="btn-primary">
          <Home className="w-4 h-4" /> Go Home
        </Link>
      </div>
    </div>
  );
}
