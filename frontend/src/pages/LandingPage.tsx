import { Link } from 'react-router-dom';
import {
  Leaf, TrendingUp, BarChart3, Brain, Database, ShieldCheck,
  ArrowRight, ChevronRight, Sprout, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';

const features = [
  { icon: Database, title: 'Historical Data Mining', desc: 'Import and analyze years of market price records to uncover meaningful patterns.' },
  { icon: Brain, title: 'Machine Learning Models', desc: 'Linear Regression, Decision Tree, and Random Forest trained on real-structured data.' },
  { icon: TrendingUp, title: 'Price Trend Analysis', desc: 'Visualize daily, monthly, and seasonal price movements across crops and markets.' },
  { icon: BarChart3, title: 'Market Comparison', desc: 'Compare current prices across multiple markets to find better selling options.' },
  { icon: Sprout, title: 'Crop & Market Explorer', desc: 'Browse all supported crops and markets with detailed profiles and data coverage.' },
  { icon: ShieldCheck, title: 'Secure & Private', desc: 'Predictions are private to each user. Data secured with JWT authentication.' },
];

const steps = [
  { n: '01', title: 'Data Collection', desc: 'Historical crop price data is collected from agricultural markets and imported via CSV.' },
  { n: '02', title: 'Preprocessing', desc: 'Missing values are handled, dates normalized, and features engineered including price lags and rolling averages.' },
  { n: '03', title: 'Model Training', desc: 'Three regression models are trained on chronologically split data. The best RMSE model is selected.' },
  { n: '04', title: 'Prediction', desc: 'Enter a crop, market, and date. The system applies the saved pipeline to generate an estimated price.' },
];

const algorithms = [
  { name: 'Linear Regression', badge: 'Baseline', desc: 'Establishes a baseline by modeling linear relationships between features and price.' },
  { name: 'Decision Tree', badge: 'Non-linear', desc: 'Captures complex conditional relationships without assuming linearity.' },
  { name: 'Random Forest', badge: 'Ensemble', desc: 'Combines hundreds of trees for improved robustness and generalization.' },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">CropCast</span>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              <a href="#features" className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100">Features</a>
              <a href="#how-it-works" className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100">How It Works</a>
              <a href="#algorithms" className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100">Algorithms</a>
            </nav>
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn-primary text-sm">
                  Go to Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link to="/login" className="btn-ghost text-sm">Sign In</Link>
                  <Link to="/register" className="btn-primary text-sm">Get Started</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-24 pb-20 bg-gradient-to-br from-primary-950 via-forest-900 to-primary-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-harvest-500 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-primary-900/60 border border-primary-700 rounded-full px-4 py-1.5 text-xs text-primary-300 font-medium mb-6">
              <Brain className="w-3.5 h-3.5" /> Data Mining + Machine Learning
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
              Predict Crop Prices with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-300 to-harvest-400">
                Data-Driven Insights
              </span>
            </h1>
            <p className="text-lg text-primary-200 mb-8 leading-relaxed max-w-2xl">
              Analyze historical agricultural market data, understand price trends, and explore
              machine learning-based crop price forecasts to support better farming decisions.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to={isAuthenticated ? '/predict' : '/register'} className="btn-primary text-base px-6 py-3 shadow-lg shadow-primary-900/50">
                Predict Crop Price <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to={isAuthenticated ? '/prices' : '/register'} className="btn bg-white/10 text-white border border-white/20 hover:bg-white/20 text-base px-6 py-3">
                Explore Market Trends <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
            {/* Disclaimer */}
            <div className="mt-8 flex items-start gap-2 bg-harvest-900/40 border border-harvest-700/50 rounded-lg px-4 py-3 max-w-xl">
              <AlertTriangle className="w-4 h-4 text-harvest-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-harvest-200 leading-relaxed">
                This is a decision-support tool. Forecasts are data-driven estimates — not guaranteed prices.
                All demonstration data is synthetic and labeled accordingly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">How It Works</h2>
            <p className="text-gray-600 max-w-xl mx-auto">A complete data mining and machine learning pipeline from raw market data to actionable forecasts.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map(({ n, title, desc }) => (
              <div key={n} className="card p-6 relative">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-primary-700 font-bold text-sm">{n}</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Key Features</h2>
            <p className="text-gray-600">Everything you need for data-driven agricultural price analysis.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card-hover p-6">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Algorithms */}
      <section id="algorithms" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">ML Algorithms</h2>
            <p className="text-gray-600">Three candidate models trained and evaluated — the best performer is selected automatically.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {algorithms.map(({ name, badge, desc }) => (
              <div key={name} className="card p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{name}</h3>
                  <span className="badge-green">{badge}</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-primary-700 to-forest-700">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to explore crop price forecasts?</h2>
          <p className="text-primary-200 mb-8">Create a free account to access predictions, historical charts, and market comparisons.</p>
          <Link to="/register" className="btn bg-white text-primary-700 hover:bg-primary-50 text-base px-8 py-3 shadow-lg">
            Get Started Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-primary-600 rounded-md flex items-center justify-center">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold">CropCast</span>
            </div>
            <p className="text-sm text-center">
              Crop Price Prediction Using Data Mining and Machine Learning |{' '}
              <span className="text-harvest-400">⚠ All demo data is synthetic. Not financial advice.</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
