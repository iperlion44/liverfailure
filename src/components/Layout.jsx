import { Outlet } from "react-router-dom";

import Navbar from "./navbar";

function Layout() {
    return (
        <>
            <a className="skip-link" href="#contenuto">
                Vai al contenuto
            </a>

            <Navbar />

            <main id="contenuto">
                <Outlet />
            </main>

            <footer className="site-footer">
                <div className="shell site-footer-inner">
                    <span className="wordmark">LiverFailure</span>
                    <span className="footer-note">
                        Bevi responsabilmente. Che poi finisci i soldi.
                    </span>
                </div>
            </footer>
        </>
    );
}

export default Layout;
