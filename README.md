# MBK Tech Studio Website

https://unilib.mbktechstudio.com/ 

**Demo:** https://demo.unilib.mbktechstudio.com/
Website Source Code 

https://github.com/MIbnEKhalid/Unilib.MIbnEKhalid.github.io/  

Detailed Documentation of this website will be available soon on: [docs.mbktechstudio.com/mbktechstudio.com](https://docs.mbktechstudio.com/mbktechstudio.com/?Project=Unilib)

![Deployment Status](https://readme.deploystatus.mbktechstudio.com/?platform=github&user=mibnekhalid&repo=Unilib.MIbnEKhalid.github.io&background=333333&hide_border=false&border=ff0&width=200&height=50)


### NOTE:
Only The Source Code Of This Website Is Covered Under The [WTFP LICENSE](https://choosealicense.com/licenses/wtfpl/). The Project Documentation, Some Images, Blog Posts, And Other Content Are NOT Covered Under This License And Remain The Intellectual Property Of The Author.



# How To Use Unillib
- **Clone or Fork the Repository:** Clone or fork the repository [`Unilib.MIbnEKhalid.github.io/Demo`](https://github.com/MIbnEKhalid/Unilib.MIbnEKhalid.github.io/tree/Demo) to your github. 
- **Update File Locations:** 
   - Both YAML files are placed in a separate branch to allow `collaborators`/`classmates` to edit them safely, so they don't fuck up with main website files. When new books or assignments need to be added, changes are made directly to the `edit/` branch YAML files, ensuring the main branch remains stable.
Additionally, the YAML files also exist in the `Assets/` folder, so if you prefer not to use a separate branch, please follow the instructions below.
  - Open `Assets/project.js` and `history/index.html` and find where `fetch` is used to get the `YAML` files.
  - **Update the URLs:** 
    - Replace `fetch('https://raw.githubusercontent.com/MIbnEKhalid/Unilib.MIbnEKhalid.github.io/main/assigmentsNquiz.yaml') ` with `fetch('Assets/assigmentsNquiz.yaml')`   
    - Replace `fetch('https://raw.githubusercontent.com/MIbnEKhalid/Unilib.MIbnEKhalid.github.io/main/books.yaml') ` with `fetch('Assets/books.yaml')`
  
- Don't worry about `.devcontainer/devcontainer.json` file its help to preinstall extension when codespace is created on github so this don't have anything to do with main project





### List Of Main Domains 

|                         | Domains                                        | Purpose                                                                                                 |
|-------------------------|------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| **Main Domain**         | [mbktechstudio.com](https://mbktechstudio.com) | Main Domain Used For all purposes for personal and official                                             |
| **Secondary Domain**    | [mbktech.xyz](https://mbktech.xyz)             | Backup domain, rarely used.                                                                             |
| **Portfolio Domain**    | [ibnekhalid.me](https://ibnekhalid.me)         | The primary website for my personal portfolio, domain was provided as part of the GitHub Student Pack.  |


### List Of mbktechstudio.com sub domains

| **Repository Name**        | **Repo Link**                                                                                              | **Website Link**                                                                       | **Purpose**                                                                      |
|----------------------------|------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------|----------------------------------------------------------------------------------|
| **Main Website**           | [MIbnEKhalid.github.io](https://github.com/MIbnEKhalid/MIbnEKhalid.github.io)                              | [mbktechstudio.com](https://mbktechstudio.com)                                         | Main Page of MBK Tech Studio                                                     |
| **Maintenance Website**    | [MIbnEKhalid.github.io/Maintenance](https://github.com/MIbnEKhalid/MIbnEKhalid.github.io/tree/Maintenance) | [mbktechstudio.com](https://mbktechstudio.com)                                         | Maintenance page deploy when websiye under Maintenance                           |
|                            |                                                                                                            | [maintenance.mbktechstudio.com](https://maintenance.mbktechstudio.com)                 |                                                                                  |
|                            |                                                                                                            | [maintenance-mbktechstudio.netlify.app](https://maintenance-mbktechstudio.netlify.app) |                                                                                  |
| **Domain Website**         | [MIbnEKhalid.github.io/domain](https://github.com/MIbnEKhalid/MIbnEKhalid.github.io/tree/domain)           | [domain.mbktechstudio.com](https://domain.mbktechstudio.com)                           | Website that showcase all subdomains)                                            |
|                            |                                                                                                            | [domains.mbktechstudio.com](https://domains.mbktechstudio.com)                         |                                                                                  |
|                            |                                                                                                            | [domain-mbktechstudio.netlify.app](https://domain-mbktechstudio.netlify.app)           |                                                                                  |
| **Main Test Website**      | [MIbnEKhalid.github.io/test](https://github.com/MIbnEKhalid/MIbnEKhalid.github.io/tree/test)               | [test.mbktechstudio.com](https://test.mbktechstudio.com)                               | Main Website Test Page                                                           |
|                            |                                                                                                            | [test-mbktechstudio.netlify.app](https://test-mbktechstudio.netlify.app)               |                                                                                  |
| **Privacy Policy Website** | [Privacy.MIbnEKhalid.github.io](https://github.com/MIbnEKhalid/Privacy.MIbnEKhalid.github.io)              | [privacy.mbktechstudio.com](https://Privacy.mbktechstudio.com)                         | Website for Privacy Policy                                                       |
|                            |                                                                                                            | [privacy-mbktechstudio.netlify.app](https://privacy-mbktechstudio.netlify.app)         |                                                                                  |
| **Docs Website**           | [Docs.MIbnEKhalid.github.io](https://github.com/MIbnEKhalid/Docs.MIbnEKhalid.github.io)                    | [Docs.mbktechstudio.com](https://docs.mbktechstudio.com)                               | Website for documentation of MBK Tech Studio's Projects, Products and apps (etc) |
|                            |                                                                                                            | [project.mbktechstudio.com](https://Project.mbktechstudio.com)                         |                                                                                  |
|                            |                                                                                                            | [docs-mbktechstudio.netlify.app](https://docs-mbktechstudio.netlify.app)               |                                                                                  |
| **Portal Website**         | [Portal.MIbnEKhalid.github.io](https://github.com/MIbnEKhalid/Portal.MIbnEKhalid.github.io)                | [portal.mbktechstudio.com](https://portal.mbktechstudio.com)                           | Website For Admins and Test Users                                                |
|                            |                                                                                                            | [portal-mbktechstudio.netlify.app](https://portal-mbktechstudio.netlify.app)           |                                                                                  |
| **Portfolio Website**      | [Portfolio.MIbnEKhalid.github.io](https://github.com/MIbnEKhalid/Portal.MIbnEKhalid.github.io)             | [portfolio.mbktechstudio.com](https://portfolio.mbktechstudio.com)                     | My Personal Portfolio Website                                                    |
|                            |                                                                                                            | [ibnekhalid.me](https://ibnekhalid.me)                                                 |                                                                                  |
|                            |                                                                                                            | [portfolio-mbktechstudio.netlify.app](https://portfolio-mbktechstudio.netlify.app)     |                                                                                  |
| **Uni Library Website**    | [Unilib.MIbnEKhalid.github.io](https://github.com/MIbnEKhalid/Unilib.MIbnEKhalid.github.io)                | [unilib.mbktechstudio.com](https://unilib.mbktechstudio.com)                           | Website For My Uni Classmates                                                    |
|                            |                                                                                                            | [unilib-mbktechstudio.netlify.app](https://unilib-mbktechstudio.netlify.app)           |                                                                                  |

 
**Note:** `mibnekhalid.github.io`, `privacy-mbktechstudio.netlify.app`, `docs-mbktechstudio.netlify.app`, `portal-mbktechstudio.netlify.app`, `portfolio-mbktechstudio.netlify.app`, `unilib-mbktechstudio.netlify.app`, `test-mbktechstudio.netlify.app`, `domain-mbktechstudio.netlify.app` and `maintenance-mbktechstudio.netlify.app` are original domains. The `mbktechstudio.com` domain is a custom domains with CNAME records redirecting to the original domains.



## Hosting:
The Main Website (MBKTechStudio.com) Is Hosted On GitHub, While Other Website (SubDomains Of MBKTechStudio) Is Hosted On Netlify

## License

This project is licensed under the WTFPL - see the [LICENSE](LICENSE) file for details.

**NOTE:** Only The Source Code Of This Website Is Covered Under The [WTFP LICENSE](https://choosealicense.com/licenses/wtfpl/). The Project Documentation, Some Images, Blog Posts, And Other Content Are NOT Covered Under This License And Remain The Intellectual Property Of The Author.
 
## Contact

For questions or contributions, please contact Muhammad Bin Khalid at [mbktechstudio.com/Support](https://mbktechstudio.com/Support/?Project=UnilibMIbnEKhalid), [support@mbktechstudio.com](mailto:support@mbktechstudio.com) or [chmuhammadbinkhalid28.com](mailto:chmuhammadbinkhalid28.com).
