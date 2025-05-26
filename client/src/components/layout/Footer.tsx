import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-[#0d021f] border-t border-[#2f1a48] mt-12 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between">
          <div className="mb-6 md:mb-0">
            <Link href="/">
              <div className="text-xl font-bold flex items-center mb-4 cursor-pointer">
                <div className="flex items-center">
                  {/* All text in one line for better proportions */}
                  <span className="font-extrabold flex items-center">
                    {/* V with outline effect - no extra spacing */}
                    <span className="relative" style={{ marginTop: '-1px' }}>
                      <span className="absolute -left-[0.5px] -top-[0.5px] text-white">V</span>
                      <span className="absolute -left-[1px] -top-[1px] text-white">V</span>
                      <span className="absolute -left-[1.5px] -top-[1.5px] text-white">V</span>
                      <span className="relative z-10 text-[#9333ea]">V</span>
                    </span>
                    {/* elo - gradient text */}
                    <span className="bg-gradient-to-r from-[#9333ea] to-[#06b6d4] bg-clip-text text-transparent">elo</span>
                    {/* Play - white text */}
                    <span className="text-[#f2f2f2]">Play</span>
                  </span>
                </div>
              </div>
            </Link>
            <p className="text-[#a68dff] max-w-md">
              Your premier destination for live sports streaming. Watch games from all major leagues in HD quality on any device.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-[#f2f2f2] font-bold mb-4">Sports</h3>
              <ul className="space-y-2">
                <li><Link href="/league/nba"><a className="text-[#a68dff] hover:text-[#7f00ff]">NBA</a></Link></li>
                <li><Link href="/league/nfl"><a className="text-[#a68dff] hover:text-[#7f00ff]">NFL</a></Link></li>
                <li><Link href="/league/mlb"><a className="text-[#a68dff] hover:text-[#7f00ff]">MLB</a></Link></li>
                <li><Link href="/league/nhl"><a className="text-[#a68dff] hover:text-[#7f00ff]">NHL</a></Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-[#f2f2f2] font-bold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><Link href="/company/about-us"><a className="text-[#a68dff] hover:text-[#7f00ff]">About Us</a></Link></li>
                <li><Link href="/company/careers"><a className="text-[#a68dff] hover:text-[#7f00ff]">Careers</a></Link></li>
                <li><Link href="/company/press"><a className="text-[#a68dff] hover:text-[#7f00ff]">Press</a></Link></li>
                <li><Link href="/company/contact"><a className="text-[#a68dff] hover:text-[#7f00ff]">Contact</a></Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-[#f2f2f2] font-bold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link href="/legal/terms-of-service"><a className="text-[#a68dff] hover:text-[#7f00ff]">Terms of Service</a></Link></li>
                <li><Link href="/legal/privacy-policy"><a className="text-[#a68dff] hover:text-[#7f00ff]">Privacy Policy</a></Link></li>
                <li><Link href="/legal/cookie-policy"><a className="text-[#a68dff] hover:text-[#7f00ff]">Cookie Policy</a></Link></li>
                <li><Link href="/legal/dmca"><a className="text-[#a68dff] hover:text-[#7f00ff]">DMCA</a></Link></li>
                <li><Link href="/legal/refund-policy"><a className="text-[#a68dff] hover:text-[#7f00ff]">Refund Policy</a></Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-[#2f1a48] flex flex-col md:flex-row justify-between items-center">
          <div className="text-[#a68dff] text-sm mb-4 md:mb-0 flex items-center">
            © {new Date().getFullYear()} 
            <span className="mx-1 font-extrabold flex items-center">
              {/* V with outline effect - no extra spacing */}
              <span className="relative" style={{ marginTop: '-1px' }}>
                <span className="absolute -left-[0.5px] -top-[0.5px] text-white">V</span>
                <span className="absolute -left-[1px] -top-[1px] text-white">V</span>
                <span className="absolute -left-[1.5px] -top-[1.5px] text-white">V</span>
                <span className="relative z-10 text-[#9333ea]">V</span>
              </span>
              {/* elo - gradient text */}
              <span className="bg-gradient-to-r from-[#9333ea] to-[#06b6d4] bg-clip-text text-transparent">elo</span>
              {/* Play - white text */}
              <span className="text-[#f2f2f2]">Play</span>
            </span>
            . All rights reserved.
          </div>
          <div className="flex space-x-4">
            <a href="#" className="text-[#a68dff] hover:text-[#7f00ff]">
              <i className="fab fa-twitter"></i>
            </a>
            <a href="#" className="text-[#a68dff] hover:text-[#7f00ff]">
              <i className="fab fa-facebook"></i>
            </a>
            <a href="#" className="text-[#a68dff] hover:text-[#7f00ff]">
              <i className="fab fa-instagram"></i>
            </a>
            <a href="#" className="text-[#a68dff] hover:text-[#7f00ff]">
              <i className="fab fa-youtube"></i>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
