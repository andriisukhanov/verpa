import type { AppProps } from 'next/app';
import { ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { Inter } from 'next/font/google';
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

const theme = {
  token: {
    colorPrimary: '#1e88e5',
    colorSuccess: '#4caf50',
    colorWarning: '#ff9800',
    colorError: '#f44336',
    borderRadius: 8,
    fontFamily: inter.style.fontFamily,
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#001529',
    },
  },
};

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ConfigProvider theme={theme} locale={ruRU}>
      <div className={inter.className}>
        <Component {...pageProps} />
      </div>
    </ConfigProvider>
  );
}