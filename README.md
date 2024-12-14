# Github Readme Deploy Status

### Note Project Is Still UnderDevelopment

<p style="text-align:center"> 
    <a href="https://vercel.com/new/clone?repository-url=https://github.com/mibnekhalid/github-readme-deploystatus">
        <img src="https://vercel.com/button" alt="Deploy with Vercel" width="150" height="50" />
    </a>
</p>

**Use This Website to Build Badge: https://readme.deploystatus.mbktechstudio.com/Builder/**


## 🚀 Introduction
GitHub Readme Deploy Status is a simple tool to display the deployment status of your projects directly in your GitHub README file. It supports multiple platforms like GitHub, Netlify, and Vercel, giving users a dynamic way to monitor the deployment status of their repositories.


## 🛠 How to Use the Badge

After generating your badge using the **[Builder Tool Page](https://readme.deploystatus.mbktechstudio.com/Builder/)**, you can easily include it in your GitHub repository's README file. Simply copy the generated Markdown or HTML code and paste it into your README.

- **Markdown example:**
  ```markdown
  ![Deployment Status](https://readme.deploystatus.mbktechstudio.com/?platform=github&user=mibnekhalid&repo=MIbnEKhalid.github.io&background=fff&hide_border=false&border=ff0&width=200&height=50)
  ```
  ![Deployment Status](https://readme.deploystatus.mbktechstudio.com/?platform=github&user=mibnekhalid&repo=MIbnEKhalid.github.io&background=fff&hide_border=false&border=ff0&width=200&height=50)
- **HTML example:**

  ```html
  <a href="https://github.com/MIbnEKhalid/github-readme-deploystatus">
      <img src="https://readme.deploystatus.mbktechstudio.com/?platform=github&user=mibnekhalid&repo=MIbnEKhalid.github.io&background=000&hide_border=true&border=ff0" alt="DeployStatus" />
  </a>
  ```
     <img src="https://readme.deploystatus.mbktechstudio.com/?platform=github&user=mibnekhalid&repo=MIbnEKhalid.github.io&background=000&hide_border=true&border=ff0" alt="DeployStatus" />

 

 


## 🔧 Options

The `platform` field is the most important parameter.

- If `platform=github`, then the `user` and `repo` parameters are required.
- If `platform=netlify`, then either the `siteid`, `name`, or `projectid` parameter is required.
- If `platform=vercel`, then either the `siteid`, `name`, or `projectid` parameter is required.

Note: Only one should be used, either `name` or `siteid`.

**Important Note:** The `theme` parameter doesn't work for now. The design is currently basic, but improvements and parameter handling will be addressed soon.

| Parameter       | Details                                                                 | Example                                                                                          |
|-----------------|-------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| `platform`      | The platform to check the status for (`github`, `netlify`, `vercel`).  | `github`, `netlify`, `vercel`                                                                    |
| `user`          | GitHub username who owns the repository                                | `mibnekhalid`                                                                                    |
| `repo`          | GitHub repository to check the status for                              | `DeployStatus`                                                                                   |
| `siteid` / `projectid`       | Site ID of the Netlify or Vercel project to check the status for        | `adsfsffgaw33r242234324`                                                                         |
| `name`          | Name of the Netlify or Vercel project to check the status for           | `adsfsffgaw33r242234324`                                                                         |
| `theme`         | The theme to apply (Default: `default`)                                 | `dark`, `radical`, etc. [🎨➜](./docs/themes.md)                                                   |
| `hide_border`   | Make the border transparent (Default: `false`)                          | `true` or `false`                                                                                |
| `background`    | Background color (e.g., `f2f2f2`, `35,d22,00f`)                         | **hex code** without `#`, **CSS color**, or gradient in the form `angle,start_color,...,end_color` |
| `border`        | Border color                                                            | **hex code** without `#` or **CSS color**                                                        |
| `width`         | Width of the card in pixels (Default: `200`)                            |                                                                                                  |
| `height`        | Height of the card in pixels (Default: `50`)                            |                                                                                                  |


## 🚀 Building the Project

To build the project, follow these steps:

1. **Clone the repository:**
    ```sh
    git clone https://github.com/mibnekhalid/github-readme-deploystatus.git
    cd github-readme-deploystatus
    ```

2. **Install dependencies:**
    ```sh
    npm install
    ```

3. **Build the project:**
    ```sh
    npm run build
    ```

4. **Run the project locally:**
    ```sh
    npm start
    ```

5. **Open your browser and navigate to:**
    ```
    http://localhost:3000
    ```

You should now see the project running locally on your machine.

## 🔧 Customizing the Project URL

To customize the project URL in the `public/Builder/script.js` file, follow these steps:

1. **Open the `public/Builder/script.js` file in your preferred code editor.**

2. **Locate the `buildURL()` function.**

3. **Find the line where the `url` constant is defined:**
    ```js
    let url = `https://readme.deploystatus.mbktechstudio.com/?platform=${platform}`;
    ```

4. **Modify the `url` constant to use your desired domain (e.g., Vercel, local, or custom domain):**
    ```js
    let url = `https://your-custom-domain.com/?platform=${platform}`;
    ```

5. **Find the `Markdown` and `HTML` badge generation code inside the `buildURL()` function:**
   ```js
   const markdown = `[![DeployStatus](${url})](https://github.com/MIbnEKhalid/github-readme-deploystatus)`;

   const html = `<a href="https://github.com/MIbnEKhalid/github-readme-deploystatus"><img src="${url}" alt="DeployStatus" /></a>`; 
   ```

6. **Modify or remove the GitHub repository links** in both the Markdown and HTML generation code if needed:
   - Change the link to your own GitHub repo
   ```js
   const markdown = `[![DeployStatus](${url})](https://github.com/your-username/your-repo)`;
   
   const html = `<a href="https://github.com/your-username/your-repo"><img src="${url}" alt="DeployStatus" /></a>`;
   ```
   - Or Remove It
   ```js
   const markdown = `![DeployStatus](${url})`;
   
   const html = `<img src="${url}" alt="DeployStatus" />`;
   ```



7. **Save the changes and rebuild the project:**
    ```sh
    npm run build
    ```

### Why Customize?
   - **Badge URL:** By customizing the URL in the script, you ensure that the badge or deployment status links point to your project’s own version, not to my project’s version.   
   - **GitHub Links:** Customizing the repository links allows you to either point to your own GitHub project or remove the links entirely, ensuring the badge reflects your project accurately.


By following these steps, you’ll ensure the badge builder reflects your project setup, and the generated Markdown/HTML badge will link to your repository or custom location.


 
 
## License
 

**Note:** Only The Source Code Of This Website Is Covered Under The **[MIT License](https://opensource.org/license/mit)**.  
The Project Documentation Covered Under The **[Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-nc-sa/4.0/)** But Some **Images, Blog Posts, And Other Content Are NOT  
Covered Under This License And Remain The Intellectual Property Of The Author**.

See the [LICENSE](LICENSE.md) file for details.
 
## Contact

For questions or contributions, please contact Muhammad Bin Khalid at [mbktechstudio.com/Support](https://mbktechstudio.com/Support/?Project=github-readme-deploystatus), [support@mbktechstudio.com](mailto:support@mbktechstudio.com) or [chmuhammadbinkhalid28.com](mailto:chmuhammadbinkhalid28.com).




<!--
https://github.com/copilot/c/d3b24c13-dacb-40a2-b3b3-5d6d60e16fd2



how to install node js on windows without admin rights
To install Node.js on Windows without admin rights, you can follow these steps:

Download the Node.js binary (.zip) from the official Node.js website.
Extract the contents of the zip file to a directory where you have write access.
Add the path to the extracted node.exe and npm (inside the node_modules) to your user PATH environment variable.
Here's a more detailed step-by-step guide:

Go to the Node.js downloads page.
Choose the zip archive for Windows (either 32-bit or 64-bit depending on your system).
Download the zip file to a location where you have write permissions.
Extract the contents of the zip file to a directory (e.g., C:\Users\YourUsername\nodejs).
Open a command prompt and run the following commands to add Node.js to your PATH:
setx PATH "%PATH%;C:\Users\YourUsername\nodejs"
Open a new command prompt and verify the installation by running:
cmd
node -v
npm -v
This should allow you to use Node.js and npm without needing admin rights.


C:\Users\TEMP.MAJUISB>node -v
v22.12.0



PS Z:\github-readme-deploystatus-main> npm run build
npm : File C:\Users\TEMP.MAJUISB\nodejs\npm.ps1 cannot be loaded. The file C:\Users\TEMP.MAJUISB\nodejs\npm.ps1 is not digitally signed. You cannot run 
this script on the current system. For more information about running scripts and setting execution policy, see about_Execution_Policies at 
https:/go.microsoft.com/fwlink/?LinkID=135170.
At line:1 char:1
+ npm run build
+ ~~~
    + CategoryInfo          : SecurityError: (:) [], PSSecurityException
    + FullyQualifiedErrorId : UnauthorizedAccess
The error you're encountering is related to the PowerShell execution policy, which prevents the running of scripts that are not digitally signed. You can bypass this by temporarily allowing the execution of unsigned scripts within your current PowerShell session.

Here are the steps to bypass the restriction:

Open PowerShell as a normal user (not as an administrator).
Run the following command to temporarily set the execution policy for the current session:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
After setting the execution policy, try running your npm command again:
npm run build
This will allow you to execute the npm script without requiring admin rights or changing the system-wide execution policy.

power shell run command?
To run a command in PowerShell, simply open PowerShell and type the command followed by Enter. For example, to display the current directory, you would type:

Get-Location
If you need to run a script or command with specific execution policies, you can adjust the policy for the session:

PowerShell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
<your-command-here>
Replace <your-command-here> with the command you wish to execute.

i mean how toopen powershell with window+r
To open PowerShell using the Windows + R shortcut, follow these steps:

Press Windows + R on your keyboard. This will open the Run dialog.
Type powershell in the Run dialog box.
Press Enter or click OK.
This will launch a new PowerShell window.

PS C:\Users\TEMP.MAJUISB> Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

Execution Policy Change
The execution policy helps protect you from scripts that you do not trust. Changing the execution policy might expose
you to the security risks described in the about_Execution_Policies help topic at
https:/go.microsoft.com/fwlink/?LinkID=135170. Do you want to change the execution policy?
[Y] Yes  [A] Yes to All  [N] No  [L] No to All  [S] Suspend  [?] Help (default is "N"):
When prompted to confirm the execution policy change, type Y and press Enter to proceed:

[Y] Yes  [A] Yes to All  [N] No  [L] No to All  [S] Suspend  [?] Help (default is "N"): Y
Once you confirm, you should be able to run your npm command without issues.

PS Z:\github-readme-deploystatus-main> node index.js
node:internal/modules/esm/resolve:857
  throw new ERR_MODULE_NOT_FOUND(packageName, fileURLToPath(base), null);
        ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'express' imported from Z:\github-readme-deploystatus-main\index.js
    at moduleResolve (node:internal/modules/esm/resolve:926:18)
    at defaultResolve (node:internal/modules/esm/resolve:1056:11)
    at ModuleLoader.defaultResolve (node:internal/modules/esm/loader:654:12)
    at #cachedDefaultResolve (node:internal/modules/esm/loader:603:25)
    at ModuleLoader.resolve (node:internal/modules/esm/loader:586:38)
    at ModuleLoader.getModuleJobForImport (node:internal/modules/esm/loader:242:38)
    at ModuleJob._link (node:internal/modules/esm/module_job:135:49) {
  code: 'ERR_MODULE_NOT_FOUND'

Node.js v22.12.0
The error indicates that the express package is not installed. You can install it using npm.

Open PowerShell and navigate to your project directory. Then run:

npm install express
After the installation completes, try running your script again:

node index.js
This should resolve the ERR_MODULE_NOT_FOUND error.

PS Z:\github-readme-deploystatus-main> npm install express
npm : File C:\Users\TEMP.MAJUISB\nodejs\npm.ps1 cannot be loaded. The file C:\Users\TEMP.MAJUISB\nodejs\npm.ps1 is not digitally signed. You cannot run 
this script on the current system. For more information about running scripts and setting execution policy, see about_Execution_Policies at 
https:/go.microsoft.com/fwlink/?LinkID=135170.
At line:1 char:1
+ npm install express
+ ~~~
    + CategoryInfo          : SecurityError: (:) [], PSSecurityException
    + FullyQualifiedErrorId : UnauthorizedAccess
To bypass the script execution policy issue, you can run npm install using the node executable directly:

node -e "require('child_process').execSync('npm install express', {stdio: 'inherit'})"
This should allow you to install the express package without encountering the execution policy error.
-->


<!--
async function loadTheme() {
  const response = await fetch('themes.json');
  const themes = await response.json();
  const themeSelect = document.getElementById('theme');
  const backgroundInput = document.getElementById('background');
  const borderInput = document.getElementById('border');

  // Populate theme options from JSON
  for (const theme in themes) {
      const option = document.createElement('option');
      option.value = theme;
      option.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
      themeSelect.appendChild(option);
  }

  themeSelect.addEventListener('change', () => {
      const selectedTheme = themeSelect.value;
      if (themes[selectedTheme]) {
          backgroundInput.value = themes[selectedTheme].background;
          borderInput.value = themes[selectedTheme].border;
      }
  });
}

document.addEventListener('DOMContentLoaded', loadTheme);

-->
