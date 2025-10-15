'use client';

import Link from 'next/link';
import styles from './style.module.scss';
import { motion, AnimatePresence } from 'framer-motion';
import { opacity, background } from './anim';
import { useEffect, useState } from 'react';
import Nav from './nav/Nav';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { RefreshCw } from 'lucide-react';

function Header() {
  const [isActive, setIsActive] = useState(false);
  const pathname = usePathname();
  const isDashboard = pathname === '/';

  useEffect(() => {
    setIsActive(false);
  }, [pathname]);

  return (
    <div className={styles.header}>
      <div className={styles.bar}>
        <Link href="/" className={styles.logo}>
          {isDashboard ? 'Rate Limiter Dashboard' : 'Rate Limitr'}
        </Link>

        <div className={styles.rightSection}>
          {/* Dashboard Controls - Only show on dashboard */}
          {isDashboard && (
            <motion.div
              variants={opacity}
              initial="open"
              animate="open"
              className={styles.dashboardControls}
            >
              <div className={styles.statusIndicator}>
                <span className={styles.greenDot} />
                <span className={styles.statusText}>Last 30 minutes</span>
              </div>
              <button 
                className={styles.refreshBtn}
                onClick={() => window.location.reload()}
              >
                <RefreshCw className={styles.refreshIcon} />
                Refresh
              </button>
              <ThemeToggle />
            </motion.div>
          )}

          <div
            onMouseDown={() => {
              setIsActive(!isActive);
            }}
            className={styles.el}
          >
            <div
              className={`${styles.burger} ${
                isActive ? styles.burgerActive : ''
              }`}
            ></div>
            <div className={styles.label}>
              <motion.p variants={opacity} animate={isActive ? 'closed' : 'open'}>
                Menu
              </motion.p>
              <motion.p
                variants={opacity}
                animate={!isActive ? 'closed' : 'open'}
              >
                Close
              </motion.p>
            </div>
          </div>
        </div>
      </div>
      <motion.div
        className={styles.background}
        variants={background}
        initial="initial"
        animate={isActive ? 'open' : 'closed'}
      ></motion.div>
      <AnimatePresence mode="wait">{isActive && <Nav />}</AnimatePresence>
    </div>
  );
}

export default Header;
