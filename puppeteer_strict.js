import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';

const html = `
<!DOCTYPE html>
<html>
<body>
  <div id="root"></div>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/babel-standalone@6/babel.min.js"></script>
  <script type="text/babel">
    function App() {
      const ref = React.useRef(false);
      const [data, setData] = React.useState(null);
      React.useEffect(() => {
        let mounted = true;
        console.log("Effect run. ref=", ref.current);
        if (ref.current) {
          console.log("Mount 2: early return");
          return;
        }
        ref.current = true;
        console.log("Mount 1: fetching");
        setTimeout(() => {
          console.log("Mount 1: finished, mounted=", mounted);
          ref.current = false;
          if (mounted) setData("done");
        }, 500);
        return () => { 
          console.log("Cleanup run");
          mounted = false; 
        };
      }, []);
      return <div>Data: {data || "loading"}</div>;
    }
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<React.StrictMode><App /></React.StrictMode>);
  </script>
</body>
</html>
`;
fs.writeFileSync('test.html', html);

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
});
server.listen(8081, async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log('[CONSOLE]', msg.text());
  });

  await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await browser.close();
  server.close();
});
