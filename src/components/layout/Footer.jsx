import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-blue-900 via-blue-900 to-blue-950 text-white">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/ua-logo.svg" alt="UA Logo" className="w-12 h-12" />
              <div>
                <h3 className="text-xl font-bold">SSITE</h3>
                <p className="text-xs text-blue-200">Student Society on IT Education</p>
              </div>
            </div>
            <p className="text-blue-200 text-sm leading-relaxed">
              Empowering students through technology, innovation, and community building.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-yellow-400">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link to="/announcements" className="text-blue-200 hover:text-white text-sm transition-colors">Announcements</Link></li>
              <li><Link to="/events" className="text-blue-200 hover:text-white text-sm transition-colors">Events</Link></li>
              <li><Link to="/officers" className="text-blue-200 hover:text-white text-sm transition-colors">Officers</Link></li>
              <li><Link to="/membership" className="text-blue-200 hover:text-white text-sm transition-colors">Membership</Link></li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-semibold mb-4 text-yellow-400">Connect With Us</h4>
            <div className="flex items-center gap-3">
              <a
                href="https://www.facebook.com/UASSITE"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            </div>
            <p className="text-blue-200 text-sm mt-4">
              University of the Assumption<br />
              College of Information Technology
            </p>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="border-t border-blue-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-sm text-blue-300 text-center">
            © {new Date().getFullYear()} SSITE. All Rights Reserved. | Student Society on Information Technology Education
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
