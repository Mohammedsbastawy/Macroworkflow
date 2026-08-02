# 🌐 Macro Workflow & ITSM System

A modern, no-code Workflow and ITSM Ticket Lifecycle Engine built with **Next.js (React)** and **MySQL**, featuring dynamic routing rules and flexible UI panels.

---

## 🚀 Local Development

### Prerequisites
- **Node.js** (v18 or higher)
- **MySQL Database Server**

### Setup & Run
1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables (`.env.local`):**
   Create a `.env.local` file in the root folder and add your database URL:
   ```env
   DATABASE_URL=mysql://username:password@localhost:3306/db_name
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to: [http://localhost:3000](http://localhost:3000)

4. **Build & Run Production Locally:**
   ```bash
   npm run build
   npm run start
   ```

---

## 🪟 Windows IIS Deployment

To run a Next.js application on IIS, we use **iisnode** to host and manage the Node.js process inside the Microsoft Web Server.

### Prerequisites
1. **Node.js** installed on the Windows Server.
2. **IIS URL Rewrite Module** installed ([Download from Microsoft](https://www.iis.net/downloads/microsoft/url-rewrite)).
3. **iisnode** installed ([Download from GitHub Releases](https://github.com/Azure/iisnode/releases)).

### Deployment Steps
1. **Build the Project:**
   ```bash
   npm run build
   ```

2. **Create Entry Script (`server.js`):**
   Create a file named `server.js` in the project root:
   ```javascript
   const { createServer } = require('http');
   const { parse } = require('url');
   const next = require('next');

   const dev = false;
   const hostname = 'localhost';
   const port = process.env.PORT || 3000;
   const app = next({ dev, hostname, port });
   const handle = app.getRequestHandler();

   app.prepare().then(() => {
     createServer(async (req, res) => {
       try {
         const parsedUrl = parse(req.url, true);
         await handle(req, res, parsedUrl);
       } catch (err) {
         console.error('Error occurred handling', req.url, err);
         res.statusCode = 500;
         res.end('Internal Server Error');
       }
     }).listen(port, (err) => {
       if (err) throw err;
       console.log(`> Ready on http://${hostname}:${port}`);
     });
   });
   ```

3. **Configure URL Routing (`web.config`):**
   Create a `web.config` file in the project root:
   ```xml
   <?xml version="1.0" encoding="utf-8"?>
   <configuration>
     <system.webServer>
       <handlers>
         <add name="iisnode" path="server.js" verb="*" modules="iisnode" />
       </handlers>
       <rewrite>
         <rules>
           <rule name="NextStatic" stopProcessing="true">
             <match url="^(_next|static|public)/.*" />
             <action type="None" />
           </rule>
           <rule name="DynamicContent">
             <conditions>
               <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="True" />
             </conditions>
             <action type="Rewrite" url="server.js" />
           </rule>
         </rules>
       </rewrite>
       <security>
         <requestFiltering>
           <hiddenSegments>
             <add segment="node_modules" />
           </hiddenSegments>
         </requestFiltering>
       </security>
       <httpErrors existingResponse="PassThrough" />
     </system.webServer>
   </configuration>
   ```

4. **Add Site in IIS Manager:**
   - Open **IIS Manager**.
   - Right-click **Sites** -> **Add Website**.
   - Set Site Name and point **Physical Path** to the project folder.
   - Configure Port/Bindings and click **OK**.
   - Ensure the `IIS_IUSRS` user group has Read/Write permissions on the project directory.

---

## 🐧 Linux Deployment (Ubuntu / RHEL)

For Linux production environments, the standard configuration uses **PM2** as the Node process manager and **Nginx** as the reverse proxy.

### Step 1: Install Node.js & PM2
Open terminal and run:
```bash
sudo apt update
sudo apt install nodejs npm -y
sudo npm install -g pm2
```

### Step 2: Build & Start with PM2
1. Navigate to directory:
   ```bash
   cd /var/www/workflow-engine
   ```
2. Build production assets:
   ```bash
   npm install
   npm run build
   ```
3. Start the application with PM2:
   ```bash
   pm2 start npm --name "workflow-system" -- start
   ```
4. Enable startup persistence:
   ```bash
   pm2 startup
   pm2 save
   ```

### Step 3: Setup Nginx Reverse Proxy
1. Install Nginx:
   ```bash
   sudo apt install nginx -y
   ```
2. Create configuration file:
   ```bash
   sudo nano /etc/nginx/sites-available/workflow
   ```
3. Paste configuration (replace `yourdomain.com` with your Server IP/Domain):
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```
4. Enable the configuration and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/workflow /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

Your application is now hosted and runs automatically in the background! 🚀
