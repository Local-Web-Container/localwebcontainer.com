(function() {
  'use strict';

  /* ------------------------------------- */

  /* animations mixin */

  /* ------------------------------------- */
  var animationsMixin = {
    mounted() {
      /* preloader screen */
      this.animPreloaderScreen(); // initialize animation effects

      window.addEventListener('load', () => this.initAnimation());
    },

    methods: {
      // preloader screen
      animPreloaderScreen() {
        let count = 0;
        const preloader = this.$refs.preloader;

        if (!preloader) {
          return;
        }

        const preloaderContent = preloader.querySelector(".preloader-content");
        const imgs = [...document.images];
        const imgsLength = imgs.length;

        const hidePreloader = () => {
          preloader.setAttribute("style", "--loading-percentage: 100%");
          gsap.timeline().set(".hide-in-preloading", {
            autoAlpha: 1
          }).to(preloaderContent, {
            delay: 0.5,
            autoAlpha: 0
          }).to(preloader, {
            y: "-100%",
            duration: 1,
            ease: "expo.in"
          }, "-=0.5").set(preloader, {
            autoAlpha: 0
          });
        };

        const imgLoaded = () => {
          count++;
          this.loadingPercentage = 100 / imgsLength * count << 0;
          preloader.setAttribute("style", `--loading-percentage: ${this.loadingPercentage}%`);

          if (count === imgsLength) {
            hidePreloader();
          }
        };

        if (imgsLength) {
          // setup preloader indicator
          imgs.forEach(img => {
            const tImg = new Image();
            tImg.onload = imgLoaded;
            tImg.onerror = imgLoaded;
            tImg.src = img.src;
          });
        } else {
          hidePreloader();
        }
      },

      // initialize animation effects
      initAnimation() {
        gsap.registerPlugin(ScrollTrigger);
        /* back to top scroll indicator */

        this.animBackTopScrollIndicator();
        /* statistics items */

        this.animStatisticsItems();
        /* section text box */

        this.animSectionTextBox();
        /* about image */

        this.animAboutImage();
        /* skills items */

        this.animSkillsItems();
        /* experience items timeline */

        this.animExperienceItemsTimeline();
        /* testimonials section title */

        this.animTestimonialsSectionTitle();
        /* testimonials items */

        this.animTestimonialsItems();
        /* contact info */

        this.animContactInfo();
        /* contact form */

        this.animContactForm();
      },

      // back to top scroll indicator
      animBackTopScrollIndicator() {
        const backTopBtn = this.$refs.scrollTopBtn;

        if (!backTopBtn) {
          return;
        }

        const showAt = backTopBtn.getAttribute('data-show-at');
        const backTopBtnPath = backTopBtn.querySelector("path");
        const backTopBtnPathLength = backTopBtnPath.getTotalLength();
        gsap.from(backTopBtn, {
          ease: "none",
          duration: 0.3,
          autoAlpha: 0,
          y: 10,
          scrollTrigger: {
            trigger: "#app-inner",
            start: `${showAt}px top`,
            end: "bottom bottom",
            toggleActions: "play none none reverse"
          }
        });
        gsap.set(backTopBtnPath, {
          strokeDasharray: backTopBtnPathLength,
          strokeDashoffset: backTopBtnPathLength,
          scrollTrigger: {
            trigger: "#app-inner",
            start: `${showAt}px top`,
            end: "bottom bottom",
            onUpdate: self => backTopBtnPath.style.strokeDashoffset = backTopBtnPathLength - self.progress * backTopBtnPathLength
          }
        });
      },

      // statistics items
      animStatisticsItems() {
        const statisticsItems = gsap.utils.toArray(".statistics-section .statistics-items li");

        if (!statisticsItems.length) {
          return;
        }

        const statisticsItemsTL = gsap.timeline({
          scrollTrigger: {
            trigger: ".statistics-items",
            start: "top 82%",
            end: "top 50%",
            scrub: 0.3
          }
        });
        statisticsItems.forEach((el, i) => {
          const pos = i === 0 ? "" : "< +=0.2";
          statisticsItemsTL.from(el, {
            autoAlpha: 0
          }, pos).from(el, {
            y: 50
          }, "<");
        });
      },

      // section text box
      animSectionTextBox() {
        const textBoxes = gsap.utils.toArray(".text-box-inline");

        if (!textBoxes.length) {
          return;
        }

        textBoxes.forEach(box => {
          gsap.timeline({
            scrollTrigger: {
              trigger: box,
              start: "top 85%",
              end: "top 35%",
              scrub: 0.3
            }
          }).from(box.querySelector(".subtitle"), {
            autoAlpha: 0,
            top: 50
          }).from(box.querySelector("h2"), {
            autoAlpha: 0,
            y: 50
          }, "-=0.2").from(box.querySelectorAll("h2 ~ *"), {
            autoAlpha: 0,
            y: 50,
            stagger: 0.2
          }, "-=0.2");
        });
      },

      // about image
      animAboutImage() {
        if (!this.$refs.aboutSection) {
          return;
        }

        gsap.timeline({
          scrollTrigger: {
            trigger: ".about-section .about-img",
            start: "top 80%",
            end: "top 50%",
            scrub: 0.3
          }
        }).from(".about-section .about-img", {
          autoAlpha: 0,
          scale: 0.5
        });
      },

      // skills items
      animSkillsItems() {
        const skillsGroups = gsap.utils.toArray(".skills-section .skills-items ul");

        if (!skillsGroups.length) {
          return;
        }

        skillsGroups.forEach(group => {
          const skillsItemsTL = gsap.timeline({
            scrollTrigger: {
              trigger: ".skills-section .skills-items",
              start: "top 85%",
              end: "top 35%",
              scrub: 0.3
            }
          });
          group.querySelectorAll("li").forEach((el, i) => {
            const pos = i === 0 ? "" : "< +=0.2";
            skillsItemsTL.from(el, {
              autoAlpha: 0
            }, pos).from(el, {
              y: 50
            }, "<");
          });
        });
      },

      // experience items timeline
      animExperienceItemsTimeline() {
        const experienceTimepath = this.$refs.experienceTimepath;
        const experienceItems = gsap.utils.toArray(".experience-timeline .timeline-items li");
        let experienceTimepathTL;
        let experienceItemsTL;
        let mainExperienceTL;

        if (experienceTimepath || experienceItems.length) {
          mainExperienceTL = gsap.timeline({
            scrollTrigger: {
              trigger: ".experience-section .experience-timeline",
              start: "top 85%",
              end: "top 35%",
              scrub: 0.3
            }
          });
        }

        if (experienceTimepath) {
          const experienceTimepathItems = gsap.utils.toArray(".experience-timeline .timepath span");
          experienceTimepathTL = gsap.timeline();
          const docDir = document.documentElement.dir;
          const fromDir = docDir === "rtl" ? "reverse" : "from";
          const reverseDir = docDir === "rtl" ? "from" : "reverse";
          const coords = {
            x: {
              from: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)",
              reverse: "polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)",
              to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)"
            },
            c: {
              from: "polygon(0% 0%, 0% 0%, 0% 0%, 0% 0%, 0% 75%, 0% 75%, 0% 75%, 0% 75%)",
              reverse: "polygon(100% 0%, 100% 0%, 100% 0%, 100% 0%, 100% 75%, 100% 75%, 100% 75%, 100% 75%)",
              to: {
                from: {
                  st1: "polygon(0% 0%, 100% 0%, 100% 0%, 100% 0%, 100% 0%, 75% 25%, 75% 25%, 0% 25%)",
                  st2: "polygon(0% 0%, 100% 0%, 100% 100%, 100% 100%, 75% 75%, 75% 75%, 75% 25%, 0% 25%)",
                  st3: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 75%, 75% 75%, 75% 25%, 0% 25%)"
                },
                reverse: {
                  st1: "polygon(100% 0%, 0% 0%, 0% 0%, 0% 0%, 0% 0%, 25% 25%, 25% 25%, 100% 25%)",
                  st2: "polygon(100% 0%, 0% 0%, 0% 100%, 0% 100%, 25% 75%, 25% 75%, 25% 25%, 100% 25%)",
                  st3: "polygon(100% 0%, 0% 0%, 0% 100%, 100% 100%, 100% 75%, 25% 75%, 25% 25%, 100% 25%)"
                }
              }
            }
          };
          const lineOdd = [...experienceTimepath.querySelectorAll(".line:nth-of-type(4n + 1)")];
          const lineEven = [...experienceTimepath.querySelectorAll(".line:nth-of-type(4n + 3)")];
          const semicircleOdd = [...experienceTimepath.querySelectorAll(".semicircle:nth-of-type(4n + 2)")];
          const semicircleEven = [...experienceTimepath.querySelectorAll(".semicircle:nth-of-type(4n + 4)")];
          experienceTimepathTL.set(experienceTimepathItems, {
            autoAlpha: 1
          }).set(lineOdd, {
            clipPath: coords.x[fromDir]
          }).set(lineEven, {
            clipPath: coords.x[reverseDir]
          }).set(semicircleOdd, {
            clipPath: coords.c[fromDir]
          }).set(semicircleEven, {
            clipPath: coords.c[reverseDir]
          });
          experienceTimepathItems.forEach(el => {
            if (lineOdd.includes(el) || lineEven.includes(el)) {
              experienceTimepathTL.to(el, {
                clipPath: coords.x.to
              });
            } else if (semicircleOdd.includes(el)) {
              experienceTimepathTL.to(el, {
                clipPath: coords.c.to[fromDir].st1
              }).to(el, {
                clipPath: coords.c.to[fromDir].st2
              }).to(el, {
                clipPath: coords.c.to[fromDir].st3
              });
            } else if (semicircleEven.includes(el)) {
              experienceTimepathTL.to(el, {
                clipPath: coords.c.to[reverseDir].st1
              }).to(el, {
                clipPath: coords.c.to[reverseDir].st2
              }).to(el, {
                clipPath: coords.c.to[reverseDir].st3
              });
            }
          });
          mainExperienceTL.add(experienceTimepathTL);
        }

        if (experienceItems.length) {
          experienceItemsTL = gsap.timeline();
          experienceItems.forEach(el => {
            experienceItemsTL.from(el, {
              autoAlpha: 0
            }).from(el, {
              scale: 0.2
            }, "<");
          });
          mainExperienceTL.add(experienceItemsTL, "< +=0.5");
        }
      },

      // testimonials section title
      animTestimonialsSectionTitle() {
        if (!this.$refs.testimonialsSection) {
          return;
        }

        gsap.timeline({
          scrollTrigger: {
            trigger: ".testimonials-section .section-title",
            start: "top 90%",
            end: "top 40%",
            scrub: 0.3
          }
        }).from(".testimonials-section .section-title .subtitle", {
          autoAlpha: 0,
          top: 50
        }).from(".testimonials-section .section-title .title", {
          autoAlpha: 0,
          y: 50
        }, "< +=0.2");
      },

      // testimonials items
      animTestimonialsItems() {
        if (!this.$refs.testimonialsSection) {
          return;
        }

        const testimonialsItems = gsap.utils.toArray(".testimonials-section .testimonials-item");
        const testimonialsItemsTL = gsap.timeline({
          scrollTrigger: {
            trigger: ".testimonials-section .testimonials-items",
            start: "top 75%",
            end: "top 25%",
            scrub: 0.3
          }
        });
        testimonialsItems.forEach((el, i) => {
          const pos = i === 0 ? "" : "< +=0.2";
          testimonialsItemsTL.from(el, {
            autoAlpha: 0
          }, pos).from(el, {
            scale: 0.2
          }, "<");
        });
      },

      // contact info
      animContactInfo() {
        const contactInfoItems = gsap.utils.toArray(".contact-section .contact-info li");

        if (!contactInfoItems.length) {
          return;
        }

        const contactInfoTL = gsap.timeline({
          scrollTrigger: {
            trigger: ".contact-section .contact-info",
            start: "top 80%",
            end: "top 50%",
            scrub: 0.3
          }
        });
        contactInfoItems.forEach((el, i) => {
          const pos = i === 0 ? "" : "< +=0.2";
          contactInfoTL.from(el, {
            autoAlpha: 0
          }, pos).from(el, {
            y: 50
          }, "<");
        }); // social icons animation

        contactInfoTL.from(".contact-section .contact-text .social li", {
          autoAlpha: 0
        }).from(".contact-section .contact-text .social li", {
          y: 50,
          stagger: 0.2
        }, "<");
      },

      // contact form
      animContactForm() {
        if (!this.$refs.contactForm) {
          return;
        }

        gsap.timeline({
          scrollTrigger: {
            trigger: ".contact-section .contact-form",
            start: "top 80%",
            end: "top 50%",
            scrub: 0.3
          }
        }).from(".contact-section .contact-form", {
          autoAlpha: 0,
          scale: 0.7
        });
      }

    }
  };

  /* ------------------------------------- */
  const app = Vue.createApp({
    mixins: [animationsMixin],

    data() {
      return {
        // the date my career started (change to yours)
        careerStartDate: 2010,
        // the date copyright started (change to yours)
        copyrightStartDate: 2022,
        // for the template theme
        appTheme: 'light_theme',
        savedTheme: null,
        // flag to toggle the preloader
        isPreloading: true,
        // toast notifications array
        notifications: [],
        // manage loading spinner status
        ajaxLoading: [],
        // for minimizing the header on scrolling down
        startMinimizingHeaderAt: 100,
        isHeaderBig: true,
        // for toggling the header on scrolling down
        lastScrollPosition: 0,
        isHeaderHidden: false,
        // flag to toggle focus style class
        isAnyFocus: false,
        // flag to toggle nav menu
        isNavMenuOpen: false,
        // list of nav links to loop through it
        navLinks: [{
          url: '/#hero',
          title: {
            en: 'Home',
          }
        }, {
          url: '/#about',
          title: {
            en: 'About',
          }
        }, {
          url: '/#skills',
          title: {
            en: 'Skills',
          }
        }, {
          url: '/#portfolio',
          title: {
            en: 'Portfolio',
          }
        }, {
          url: '/#contact',
          title: {
            en: 'Contact',
          }
        }],
        // flag to toggle between skills types in skills section
        skillsType: '',
        // list of skills items to loop through it
        skillsItems: [{
          imgUrl: '/assets/images/skills/html5.png',
          title: 'HTML5'
        }, {
          imgUrl: '/assets/images/skills/css3.png',
          title: 'CSS'
        }, {
          imgUrl: '/assets/images/skills/javascript.png',
          title: 'JavaScript'
        }, {
          imgUrl: '/assets/images/skills/typescript.png',
          title: 'TypeScript'
        }, {
          imgUrl: '/assets/images/skills/jquery.png',
          title: 'jQuery'
        }, {
          imgUrl: '/assets/images/skills/bootstrap.png',
          title: 'Bootstrap'
        }, {
          imgUrl: '/assets/images/skills/angular.png',
          title: 'Angular'
        }, {
          imgUrl: '/assets/images/skills/react.png',
          title: 'React'
        }, {
          imgUrl: '/assets/images/skills/vue.png',
          title: 'Vue'
        }, {
          imgUrl: '/assets/images/skills/firebase.png',
          title: 'Firebase'
        }, {
          imgUrl: '/assets/images/skills/pugjs.png',
          title: 'PugJS'
        }, {
          imgUrl: '/assets/images/skills/sass.png',
          title: 'SASS'
        }],
        // list of tools items to loop through it
        toolsItems: [{
          imgUrl: '/assets/images/skills/esbuild.svg',
          title: 'ESbuild'
        }, /* {
          imgUrl: '/assets/images/skills/gulp.png',
          title: 'Gulp'
        }, {
          imgUrl: '/assets/images/skills/webpack.png',
          title: 'Webpack'
        }, {
          imgUrl: '/assets/images/skills/command.png',
          title: 'Command Line'
        }, {
          imgUrl: '/assets/images/skills/vs-code.png',
          title: 'VS Code'
        }, {
          imgUrl: '/assets/images/skills/trello.png',
          title: 'Trello'
        }, {
          imgUrl: '/assets/images/skills/clickup.png',
          title: 'ClickUp'
        }, {
          imgUrl: '/assets/images/skills/slack.png',
          title: 'Slack'
        }, {
          imgUrl: '/assets/images/skills/photoshop.png',
          title: 'Photoshop'
        }, {
          imgUrl: '/assets/images/skills/adobe-xd.png',
          title: 'Adobe XD'
        }, */ {
          imgUrl: '/assets/images/skills/git.png',
          title: 'Git (Github)'
        }, {
          imgUrl: '/assets/images/skills/npm.png',
          title: 'Npm'
        }],
        // list of experience items to loop through it
        experienceItems: [{
          date: '.MD',
          companyName: {
            en: 'Markdown.',
          },
          jobTitle: {
            en: 'Renderer',
          },
          desc: {
            en: 'We automatically generate html from markdown files.',
          }
        }, {
          date: '.JSON',
          companyName: {
            en: 'Renderer',
          },
          jobTitle: {
            en: 'Renderer',
          },
          desc: {
            en: 'We automatically generate pretty readable json output.',
          }
        }, {
          date: '.TS',
          companyName: {
            en: 'Typescript.',
          },
          jobTitle: {
            en: 'JIT Compiler',
          },
          desc: {
            en: 'When you load a typescript file, we compile it to javascript automatically.',
          }
        }, {
          date: 'fs',
          companyName: {
            en: 'whatwg - fs.',
          },
          jobTitle: {
            en: 'Front-End Developer',
          },
          desc: {
            en: 'Upload a folder as a root directory and see changes in real time.',
          }
        }, {
          date: 'iDB',
          companyName: {
            en: 'IndexedDB.',
          },
          jobTitle: {
            en: 'Full Stack Developer',
          },
          desc: {
            en: 'Get a full blasted GUI for your IndexedDB database.',
          }
        }, {
          date: '?',
          companyName: {
            en: 'Google Inc.',
          },
          jobTitle: {
            en: 'Front-End Developer',
          },
          desc: {
            en: 'Monitored technical aspects of the front-end delivery for projects.',
          }
        }, {
          date: '?',
          companyName: {
            en: 'Facebook Inc.',
          },
          jobTitle: {
            en: 'Full Stack Developer',
          },
          desc: {
            en: 'Collaborate with creative and development teams on the execution of ideas.',
          }
        }, {}, {}],
        // current page of portfolio items
        portfolioItemsPage: 1,
        // portfolio items per page
        itemsPerPage: 7,
        // portfolio items filter by type
        filters: ['All', 'HTML', 'Angular', 'Vue'],
        currentFilter: 'All',
        // portfolio archive name
        portfolioArchiveName: '',
        allContainers: document.cookie.split(/; */).filter(x => x.endsWith('=cma')).map(x => x.split('=')[0]),
        // list of portfolio items to loop through it
        allPortfolioItems: [{
          id: 1,
          url: 'single-portfolio.html?id=1',
          imgUrl: 'https://via.placeholder.com/400x400',
          title: {
            en: 'Lorem Ipsum Dolor 1',
          },
          date: {
            en: 'April 2021',
          },
          desc: {
            en: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.',
          },
          category: 'HTML',
          tools: ['HTML', 'PugJS', 'CSS', 'SCSS', 'JavaScript', 'Gulp', 'Bootstrap', 'AJAX', 'Vue', 'Firebase'],
          screenshots: {
            img1: {
              url: 'https://via.placeholder.com/355x200',
              caption: {
                en: 'caption 5',
              }
            },
            img2: {
              url: 'https://via.placeholder.com/330x460',
              caption: {
                en: 'caption 4',
              }
            },
            img3: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 3',
              }
            },
            img4: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 2',
              }
            },
            img5: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 1',
              }
            }
          }
        }, {
          id: 2,
          url: 'single-portfolio.html?id=2',
          imgUrl: 'https://via.placeholder.com/530x300',
          title: {
            en: 'Lorem Ipsum Dolor 2',
          },
          date: {
            en: 'April 2021',
          },
          desc: {
            en: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.',
          },
          category: 'Angular',
          tools: ['HTML', 'Slim', 'CSS', 'Less', 'JavaScript', 'TypeScript', 'TailwindCSS', 'AJAX', 'Angular', 'NodeJs', 'MongoDB'],
          screenshots: {
            img1: {
              url: 'https://via.placeholder.com/355x200',
              caption: {
                en: 'caption 5',
              }
            },
            img2: {
              url: 'https://via.placeholder.com/330x460',
              caption: {
                en: 'caption 4',
              }
            },
            img3: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 3',
              }
            },
            img4: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 2',
              }
            },
            img5: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 1',
              }
            }
          }
        }, {
          id: 3,
          url: 'single-portfolio.html?id=3',
          imgUrl: 'https://via.placeholder.com/390x390',
          title: {
            en: 'Lorem Ipsum Dolor 3',
          },
          date: {
            en: 'April 2021',
          },
          desc: {
            en: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.',
          },
          category: 'Vue',
          tools: ['HTML', 'PugJS', 'CSS', 'SCSS', 'JavaScript', 'Gulp', 'Materialize', 'AJAX', 'Vue', 'Firebase'],
          screenshots: {
            img1: {
              url: 'https://via.placeholder.com/355x200',
              caption: {
                en: 'caption 5',
              }
            },
            img2: {
              url: 'https://via.placeholder.com/330x460',
              caption: {
                en: 'caption 4',
              }
            },
            img3: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 3',
              }
            },
            img4: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 2',
              }
            },
            img5: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 1',
              }
            }
          }
        }, {
          id: 4,
          url: 'single-portfolio.html?id=4',
          imgUrl: 'https://via.placeholder.com/340x510',
          title: {
            en: 'Lorem Ipsum Dolor 4',
          },
          date: {
            en: 'April 2021',
          },
          desc: {
            en: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.',
          },
          category: 'HTML',
          tools: ['HTML', 'Slim', 'CSS', 'Less', 'JavaScript', 'TypeScript', 'TailwindCSS', 'AJAX', 'Angular', 'NodeJs', 'MongoDB'],
          screenshots: {
            img1: {
              url: 'https://via.placeholder.com/355x200',
              caption: {
                en: 'caption 5',
              }
            },
            img2: {
              url: 'https://via.placeholder.com/330x460',
              caption: {
                en: 'caption 4',
              }
            },
            img3: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 3',
              }
            },
            img4: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 2',
              }
            },
            img5: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 1',
              }
            }
          }
        }, {
          id: 5,
          url: 'single-portfolio.html?id=5',
          imgUrl: 'https://via.placeholder.com/380x215',
          title: {
            en: 'Lorem Ipsum Dolor 5',
          },
          date: {
            en: 'April 2021',
          },
          desc: {
            en: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.',
          },
          category: 'Angular',
          tools: ['HTML', 'PugJS', 'CSS', 'SCSS', 'JavaScript', 'Gulp', 'Bootstrap', 'AJAX', 'Vue', 'Firebase'],
          screenshots: {
            img1: {
              url: 'https://via.placeholder.com/355x200',
              caption: {
                en: 'caption 5',
              }
            },
            img2: {
              url: 'https://via.placeholder.com/330x460',
              caption: {
                en: 'caption 4',
              }
            },
            img3: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 3',
              }
            },
            img4: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 2',
              }
            },
            img5: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 1',
              }
            }
          }
        }, {
          id: 6,
          url: 'single-portfolio.html?id=6',
          imgUrl: 'https://via.placeholder.com/400x300',
          title: {
            en: 'Lorem Ipsum Dolor 6',
          },
          date: {
            en: 'April 2021',
          },
          desc: {
            en: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.',
          },
          category: 'Vue',
          tools: ['HTML', 'Slim', 'CSS', 'Less', 'JavaScript', 'TypeScript', 'Materialize', 'AJAX', 'Angular', 'NodeJs', 'MongoDB'],
          screenshots: {
            img1: {
              url: 'https://via.placeholder.com/355x200',
              caption: {
                en: 'caption 5',
              }
            },
            img2: {
              url: 'https://via.placeholder.com/330x460',
              caption: {
                en: 'caption 4',
              }
            },
            img3: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 3',
              }
            },
            img4: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 2',
              }
            },
            img5: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 1',
              }
            }
          }
        }, {
          id: 7,
          url: 'single-portfolio.html?id=7',
          imgUrl: 'https://via.placeholder.com/380x215',
          title: {
            en: 'Lorem Ipsum Dolor 7',
          },
          date: {
            en: 'April 2021',
          },
          desc: {
            en: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.',
          },
          category: 'HTML',
          tools: ['HTML', 'PugJS', 'CSS', 'SCSS', 'JavaScript', 'Gulp', 'Bootstrap', 'AJAX', 'Vue', 'Firebase'],
          screenshots: {
            img1: {
              url: 'https://via.placeholder.com/355x200',
              caption: {
                en: 'caption 5',
              }
            },
            img2: {
              url: 'https://via.placeholder.com/330x460',
              caption: {
                en: 'caption 4',
              }
            },
            img3: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 3',
              }
            },
            img4: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 2',
              }
            },
            img5: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 1',
              }
            }
          }
        }, {
          id: 8,
          url: 'single-portfolio.html?id=8',
          imgUrl: 'https://via.placeholder.com/340x340',
          title: {
            en: 'Lorem Ipsum Dolor 8',
          },
          date: {
            en: 'April 2021',
          },
          desc: {
            en: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.',
          },
          category: 'Vue',
          tools: ['HTML', 'Slim', 'CSS', 'Less', 'JavaScript', 'TypeScript', 'TailwindCSS', 'AJAX', 'Angular', 'NodeJs', 'MongoDB'],
          screenshots: {
            img1: {
              url: 'https://via.placeholder.com/355x200',
              caption: {
                en: 'caption 5',
              }
            },
            img2: {
              url: 'https://via.placeholder.com/330x460',
              caption: {
                en: 'caption 4',
              }
            },
            img3: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 3',
              }
            },
            img4: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 2',
              }
            },
            img5: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 1',
              }
            }
          }
        }, {
          id: 9,
          url: 'single-portfolio.html?id=9',
          imgUrl: 'https://via.placeholder.com/300x375',
          title: {
            en: 'Lorem Ipsum Dolor 9',
          },
          date: {
            en: 'April 2021',
          },
          desc: {
            en: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.',
          },
          category: 'Angular',
          tools: ['HTML', 'PugJS', 'CSS', 'SCSS', 'JavaScript', 'Gulp', 'Materialize', 'AJAX', 'Vue', 'Firebase'],
          screenshots: {
            img1: {
              url: 'https://via.placeholder.com/355x200',
              caption: {
                en: 'caption 5',
              }
            },
            img2: {
              url: 'https://via.placeholder.com/330x460',
              caption: {
                en: 'caption 4',
              }
            },
            img3: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 3',
              }
            },
            img4: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 2',
              }
            },
            img5: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 1',
              }
            }
          }
        }, {
          id: 10,
          url: 'single-portfolio.html?id=10',
          imgUrl: 'https://via.placeholder.com/350x200',
          title: {
            en: 'Lorem Ipsum Dolor 10',
          },
          date: {
            en: 'April 2021',
          },
          desc: {
            en: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.',
          },
          category: 'HTML',
          tools: ['HTML', 'Slim', 'CSS', 'Less', 'JavaScript', 'TypeScript', 'Bootstrap', 'AJAX', 'Angular', 'NodeJs', 'MongoDB'],
          screenshots: {
            img1: {
              url: 'https://via.placeholder.com/355x200',
              caption: {
                en: 'caption 5',
              }
            },
            img2: {
              url: 'https://via.placeholder.com/330x460',
              caption: {
                en: 'caption 4',
              }
            },
            img3: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 3',
              }
            },
            img4: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 2',
              }
            },
            img5: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 1',
              }
            }
          }
        }, {
          id: 11,
          url: 'single-portfolio.html?id=11',
          imgUrl: 'https://via.placeholder.com/400x300',
          title: {
            en: 'Lorem Ipsum Dolor 11',
          },
          date: {
            en: 'April 2021',
          },
          desc: {
            en: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.',
          },
          category: 'Vue',
          tools: ['HTML', 'PugJS', 'CSS', 'SCSS', 'JavaScript', 'Gulp', 'TailwindCSS', 'AJAX', 'Angular', 'Firebase'],
          screenshots: {
            img1: {
              url: 'https://via.placeholder.com/355x200',
              caption: {
                en: 'caption 5',
              }
            },
            img2: {
              url: 'https://via.placeholder.com/330x460',
              caption: {
                en: 'caption 4',
              }
            },
            img3: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 3',
              }
            },
            img4: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 2',
              }
            },
            img5: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 1',
              }
            }
          }
        }, {
          id: 12,
          url: 'single-portfolio.html?id=12',
          imgUrl: 'https://via.placeholder.com/300x280',
          title: {
            en: 'Lorem Ipsum Dolor 12',
          },
          date: {
            en: 'April 2021',
          },
          desc: {
            en: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.',
          },
          category: 'Angular',
          tools: ['HTML', 'Slim', 'CSS', 'Less', 'JavaScript', 'TypeScript', 'Materialize', 'AJAX', 'Vue', 'NodeJs', 'MongoDB'],
          screenshots: {
            img1: {
              url: 'https://via.placeholder.com/355x200',
              caption: {
                en: 'caption 5',
              }
            },
            img2: {
              url: 'https://via.placeholder.com/330x460',
              caption: {
                en: 'caption 4',
              }
            },
            img3: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 3',
              }
            },
            img4: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 2',
              }
            },
            img5: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 1',
              }
            }
          }
        }, {
          id: 13,
          url: 'single-portfolio.html?id=13',
          imgUrl: 'https://via.placeholder.com/300x270',
          title: {
            en: 'Lorem Ipsum Dolor 13',
          },
          date: {
            en: 'April 2021',
          },
          desc: {
            en: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.',
          },
          category: 'HTML',
          tools: ['HTML', 'PugJS', 'CSS', 'SCSS', 'JavaScript', 'Gulp', 'TailwindCSS', 'AJAX', 'Angular', 'Firebase'],
          screenshots: {
            img1: {
              url: 'https://via.placeholder.com/355x200',
              caption: {
                en: 'caption 5',
              }
            },
            img2: {
              url: 'https://via.placeholder.com/330x460',
              caption: {
                en: 'caption 4',
              }
            },
            img3: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 3',
              }
            },
            img4: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 2',
              }
            },
            img5: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 1',
              }
            }
          }
        }, {
          id: 14,
          url: 'single-portfolio.html?id=14',
          imgUrl: 'https://via.placeholder.com/375x500',
          title: {
            en: 'Lorem Ipsum Dolor 14',
          },
          date: {
            en: 'April 2021',
          },
          desc: {
            en: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.',
          },
          category: 'Angular',
          tools: ['HTML', 'Slim', 'CSS', 'Less', 'JavaScript', 'TypeScript', 'Bootstrap', 'AJAX', 'Vue', 'NodeJs', 'MongoDB'],
          screenshots: {
            img1: {
              url: 'https://via.placeholder.com/355x200',
              caption: {
                en: 'caption 5',
              }
            },
            img2: {
              url: 'https://via.placeholder.com/330x460',
              caption: {
                en: 'caption 4',
              }
            },
            img3: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 3',
              }
            },
            img4: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 2',
              }
            },
            img5: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 1',
              }
            }
          }
        }, {
          id: 15,
          url: 'single-portfolio.html?id=15',
          imgUrl: 'https://via.placeholder.com/375x240',
          title: {
            en: 'Lorem Ipsum Dolor 15',
          },
          date: {
            en: 'April 2021',
          },
          desc: {
            en: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.',
          },
          category: 'Vue',
          tools: ['HTML', 'PugJS', 'CSS', 'SCSS', 'JavaScript', 'Gulp', 'Materialize', 'AJAX', 'Angular', 'Firebase'],
          screenshots: {
            img1: {
              url: 'https://via.placeholder.com/355x200',
              caption: {
                en: 'caption 5',
              }
            },
            img2: {
              url: 'https://via.placeholder.com/330x460',
              caption: {
                en: 'caption 4',
              }
            },
            img3: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 3',
              }
            },
            img4: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 2',
              }
            },
            img5: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 1',
              }
            }
          }
        }, {
          id: 16,
          url: 'https://pwa-heaven.localwebcontainer.com/torrent-client/public/index.html?installFrom=gh/ThaUnknown/pwa-haven@main',
          imgUrl: 'https://via.placeholder.com/570x400',
          title: {
            en: 'Lorem Ipsum Dolor 16',
          },
          date: {
            en: 'April 2021',
          },
          desc: {
            en: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.',
          },
          category: 'HTML',
          tools: ['HTML', 'Slim', 'CSS', 'Less', 'JavaScript', 'TypeScript', 'Bootstrap', 'AJAX', 'Vue', 'NodeJs', 'MongoDB'],
          screenshots: {
            img1: {
              url: 'https://via.placeholder.com/355x200',
              caption: {
                en: 'caption 5',
              }
            },
            img2: {
              url: 'https://via.placeholder.com/330x460',
              caption: {
                en: 'caption 4',
              }
            },
            img3: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 3',
              }
            },
            img4: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 2',
              }
            },
            img5: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 1',
              }
            }
          }
        }, {
          id: 17,
          url: 'single-portfolio.html?id=17',
          imgUrl: 'https://via.placeholder.com/375x300',
          title: {
            en: 'Lorem Ipsum Dolor 17',
          },
          date: {
            en: 'April 2021',
          },
          desc: {
            en: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.',
          },
          category: 'Angular',
          tools: ['HTML', 'PugJS', 'CSS', 'SCSS', 'JavaScript', 'Gulp', 'TailwindCSS', 'AJAX', 'Angular', 'Firebase'],
          screenshots: {
            img1: {
              url: 'https://via.placeholder.com/355x200',
              caption: {
                en: 'caption 5',
              }
            },
            img2: {
              url: 'https://via.placeholder.com/330x460',
              caption: {
                en: 'caption 4',
              }
            },
            img3: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 3',
              }
            },
            img4: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 2',
              }
            },
            img5: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 1',
              }
            }
          }
        }, {
          id: 18,
          url: 'single-portfolio.html?id=18',
          imgUrl: 'https://via.placeholder.com/350x500',
          title: {
            en: 'Lorem Ipsum Dolor 18',
          },
          date: {
            en: 'April 2021',
          },
          desc: {
            en: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.',
          },
          category: 'Vue',
          tools: ['HTML', 'Slim', 'CSS', 'Less', 'JavaScript', 'TypeScript', 'Materialize', 'AJAX', 'Vue', 'NodeJs', 'MongoDB'],
          screenshots: {
            img1: {
              url: 'https://via.placeholder.com/355x200',
              caption: {
                en: 'caption 5',
              }
            },
            img2: {
              url: 'https://via.placeholder.com/330x460',
              caption: {
                en: 'caption 4',
              }
            },
            img3: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 3',
              }
            },
            img4: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 2',
              }
            },
            img5: {
              url: 'https://via.placeholder.com/300x225',
              caption: {
                en: 'caption 1',
              }
            }
          }
        }].reverse(),
        // viewed portfolio items
        portfolioItems: [],
        // list of testimonials items to loop through it
        testimonialsItems: [{
          imgUrl: 'https://boredhumans.b-cdn.net/faces2/580.jpg',
          quoteContent: {
            en: 'Nafie simply provides amazing web development service. Their team is extremely professional and the easiest to meet I have ever worked with. I would recommend Nafie to anyone.'
          },
          quoteAuthor: {
            en: 'Emily T. Hanson',
          },
          jobTitle: {
            en: 'Photographer',
          }
        }, {
          imgUrl: 'https://boredhumans.b-cdn.net/faces2/191.jpg',
          quoteContent: {
            en: 'Excellent Team to work with. Always positive to find the most appropriate solution. Nafie is one of the professional web development agency that provides awesome services.',
          },
          quoteAuthor: {
            en: 'Lonny Corkery',
          },
          jobTitle: {
            en: 'Project Manager',
          }
        }, {
          imgUrl: 'https://boredhumans.b-cdn.net/faces2/799.jpg',
          quoteContent: {
            en: 'Nafie team is very professional, always delivers high quality results, and is always there to help. Look forward to working with Nafie in other projects.',
          },
          quoteAuthor: {
            en: 'Max Schmidt DDS'
          },
          jobTitle: {
            en: 'CEO, Designer'
          }
        }, {
          imgUrl: 'https://boredhumans.b-cdn.net/faces2/783.jpg',
          quoteContent: {
            en: 'Nafie worked on a handful of projects for us and has always exceeded our expectations. Nafie team is dedicated, talented and a delight to work with.'
          },
          quoteAuthor: {
            en: 'Amir Stoltenberg'
          },
          jobTitle: {
            en: 'Sales Manager',
          }
        }, {
          imgUrl: 'https://boredhumans.b-cdn.net/faces2/294.jpg',
          quoteContent: {
            en: 'I know I can count on your service if I need my project done fast and with the best possible result. I am a regular customer and hope to continue our work!',
          },
          quoteAuthor: {
            en: 'Kenton Marquardt',
          },
          jobTitle: {
            en: 'Art Director',
          }
        }, {
          imgUrl: 'https://boredhumans.b-cdn.net/faces2/289.jpg',
          quoteContent: {
            en: 'Muhammad was a real pleasure to work with and we look forward to working with him again. He’s definitely the kind of developer you can trust with a project from start to finish.',
          },
          quoteAuthor: {
            en: 'Reyna Hammes',
          },
          jobTitle: {
            en: 'Motion Graphic Animator',
          }
        }, {
          imgUrl: 'https://boredhumans.b-cdn.net/faces2/872.jpg',
          quoteContent: {
            en: 'Muhammad was a real pleasure to work with and we look forward to working with him again. He’s definitely the kind of developer you can trust with a project from start to finish.',
          },
          quoteAuthor: {
            en: 'Jovan Parisian',
          },
          jobTitle: {
            en: 'Motion Graphic Animator',
          }
        }, {
          imgUrl: 'https://boredhumans.b-cdn.net/faces2/573.jpg',
          quoteContent: {
            en: 'I know I can count on your service if I need my project done fast and with the best possible result. I am a regular customer and hope to continue our work!',
          },
          quoteAuthor: {
            en: 'Pasquale Deckow',
          },
          jobTitle: {
            en: 'Art Director',
          }
        }, {
          imgUrl: 'https://boredhumans.b-cdn.net/faces2/407.jpg',
          quoteContent: {
            en: 'Nafie worked on a handful of projects for us and has always exceeded our expectations. Nafie team is dedicated, talented and a delight to work with.'
          },
          quoteAuthor: {
            en: 'Rosa Ferry',
          },
          jobTitle: {
            en: 'Sales Manager',
          }
        }, {
          imgUrl: 'https://boredhumans.b-cdn.net/faces2/966.jpg',
          quoteContent: {
            en: 'Nafie team is very professional, always delivers high quality results, and is always there to help. Look forward to working with Nafie in other projects.',
          },
          quoteAuthor: {
            en: 'Keshaun Robel',
          },
          jobTitle: {
            en: 'CEO, Designer'
          }
        }, {
          imgUrl: 'https://boredhumans.b-cdn.net/faces2/332.jpg',
          quoteContent: {
            en: 'Excellent Team to work with. Always positive to find the most appropriate solution. Nafie is one of the professional web development agency that provides awesome services.',
          },
          quoteAuthor: {
            en: 'Casper Paucek',
          },
          jobTitle: {
            en: 'Project Manager',
          }
        }, {
          imgUrl: 'https://boredhumans.b-cdn.net/faces2/96.jpg',
          quoteContent: {
            en: 'Nafie simply provides amazing web development service. Their team is extremely professional and the easiest to meet I have ever worked with. I would recommend Nafie to anyone.',
          },
          quoteAuthor: {
            en: 'Archibald Fadel',
          },
          jobTitle: {
            en: 'Photographer',
          }
        }, {
          imgUrl: 'https://boredhumans.b-cdn.net/faces2/280.jpg',
          quoteContent: {
            en: 'Nafie simply provides amazing web development service. Their team is extremely professional and the easiest to meet I have ever worked with. I would recommend Nafie to anyone.',
          },
          quoteAuthor: {
            en: 'Tabitha Denesik',
          },
          jobTitle: {
            en: 'Photographer',
          }
        }, {
          imgUrl: 'https://boredhumans.b-cdn.net/faces2/84.jpg',
          quoteContent: {
            en: 'Excellent Team to work with. Always positive to find the most appropriate solution. Nafie is one of the professional web development agency that provides awesome services.',
          },
          quoteAuthor: {
            en: 'Javon Bogan',
          },
          jobTitle: {
            en: 'Project Manager',
          }
        }, {
          imgUrl: 'http://2.gravatar.com/avatar/b6d008a81484959877abe453a9ed97be?size=200',
          quoteContent: {
            en: 'This is very professional, always delivers high quality results, and is always there to help. Look forward to working with this in other projects.',
          },
          quoteAuthor: {
            en: 'Stefan Wärting',
          },
          jobTitle: {
            en: 'CEO'
          }
        }, {
          imgUrl: 'https://s.gravatar.com/avatar/02f476ed950384700afba952f6efaa28?s=200',
          quoteContent: {
            en: 'It was so quick to set up a local development project at start working on it. I was able to get the project done in a matter of hours. I would recommend this to anyone.',
          },
          quoteAuthor: {
            en: 'Jimmy Wärting',
          },
          jobTitle: {
            en: 'System developer',
          }
        }, {
          imgUrl: 'https://boredhumans.b-cdn.net/faces2/383.jpg',
          quoteContent: {
            en: 'I know I can count on your service if I need my project done fast and with the best possible result. I am a regular customer and hope to continue our work!',
          },
          quoteAuthor: {
            en: 'Murphy Roberts',
          },
          jobTitle: {
            en: 'Art Director',
          }
        }, {
          imgUrl: 'https://boredhumans.b-cdn.net/faces2/976.jpg',
          quoteContent: {
            en: 'Muhammad was a real pleasure to work with and we look forward to working with him again. He’s definitely the kind of developer you can trust with a project from start to finish.',
          },
          quoteAuthor: {
            en: 'Dimitri Lockman',
          },
          jobTitle: {
            en: 'Motion Graphic Animator',
          }
        }]
      };
    },

    created() {
      // get a theme to use
      this.getAppTheme();
    },

    mounted() {
      if (window.innerWidth >= 992) {
        // initialize circle cursor
        // this.initCircleCursor(); // apply pan effect hero image

        this.heroImgPanEffect(); // initialize VanillaTilt library in portfolio section

        this.initializeTilt();
      } // nav menu tab trap


      this.navMenuTabTrap(); // scrolling options

      this.scrollingOptions();
      document.addEventListener('scroll', () => this.scrollingOptions()); // initialize popper.js plugin

      document.querySelectorAll('.has-ultimate-tooltip').forEach(el => {
        Popper.createPopper(el, el.querySelector('.ultimate-tooltip'), {
          placement: 'top',
          modifiers: [{
            name: 'offset',
            options: {
              offset: [0, 30]
            }
          }]
        });
      }); // get portfolio items

      this.getPortfolioItems(); // init glightbox plugin

      new GLightbox({
        autoplayVideos: false
      }); // initialize the first displayed type of skills

      this.initSkillsFirstType();
    },

    methods: {
      // initialize circle cursor
      /*
      initCircleCursor() {
        const app = this.$refs.appRef;
        const outer = this.$refs.circleCursorOuter;
        const inner = this.$refs.circleCursorInner; // return if disabled

        if (!outer || !inner) {
          return;
        }

        app.addEventListener('mousemove', e => {
          // make the circles follow the cursor
          outer.setAttribute('style', `visibility: visible; top: ${e.clientY}px; left: ${e.clientX}px;`);
          inner.setAttribute('style', `visibility: visible; top: ${e.clientY}px; left: ${e.clientX}px;`); // add link hover style

          e.target.closest('a') || e.target.closest('button') || e.target.closest('.link-hover') ? inner.classList.add('cursor-link-hover') : inner.classList.remove('cursor-link-hover');
        });
        app.addEventListener('click', () => {
          // add pulse effect on click
          inner.classList.add('cursor-click-effect');
          setTimeout(() => inner.classList.remove('cursor-click-effect'), 200);
        });
      },
      */
      // get a theme to use
      getAppTheme() {
        // get the saved theme from the localStorage
        const storageSavedTheme = localStorage.getItem('nafieSavedTheme'); // Check to see if there a saved theme

        if (storageSavedTheme) {
          this.savedTheme = storageSavedTheme;
        } else {
          // So, try to get the browser default theme or make your own default
          // Check to see if Media-Queries are supported
          if (window.matchMedia) {
            // Check if the dark-mode Media-Query matches
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
              this.savedTheme = 'dark_theme';
            } else {
              this.savedTheme = 'light_theme';
            }
          } else {
            // Default (when Media-Queries are not supported)
            this.savedTheme = this.appTheme;
          }
        } // save the new theme in the localStorage


        localStorage.setItem('nafieSavedTheme', this.savedTheme);
      },

      // detect the theme changes
      changeAppTheme() {
        this.savedTheme === 'light_theme' ? this.savedTheme = 'dark_theme' : this.savedTheme = 'light_theme'; // save the new theme in the localStorage

        localStorage.setItem('nafieSavedTheme', this.savedTheme);
      },

      // toggle nav menu
      toggleNavMenu() {
        this.isNavMenuOpen = !this.isNavMenuOpen;
        this.isNavMenuOpen ? this.openNavMenu() : this.closeNavMenu();
      },

      // open nav menu
      openNavMenu() {
        const bodyEl = document.getElementsByTagName('body')[0];
        this.isNavMenuOpen = true;
        bodyEl.setAttribute('style', 'overflow-y: hidden;'); // set focus on nav menu

        this.$refs.headerNav.querySelector('.desktop-menu-content').focus();
      },

      // close nav menu
      closeNavMenu() {
        const bodyEl = document.getElementsByTagName('body')[0];
        this.isNavMenuOpen = false;
        bodyEl.removeAttribute('style'); // set focus on nav menu toggle button

        this.$refs.navMenuToggleBtn.focus();
      },

      // nav menu tab trap
      navMenuTabTrap() {
        const nav = this.$refs.headerNav;
        const focusableElementsString = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex="0"]';
        let firstTabStop;
        let lastTabStop;
        let isFirstTabStop;
        let isLastTabStop;
        document.addEventListener('keyup', e => {
          if (nav.classList.contains('menu-open')) {
            // get first & last focusable elements in the side menu for the tab trap
            const visibleFocusableEls = [...nav.querySelectorAll(focusableElementsString)].filter(el => window.getComputedStyle(el).getPropertyValue('visibility') !== 'hidden');
            firstTabStop = visibleFocusableEls[0];
            lastTabStop = visibleFocusableEls[visibleFocusableEls.length - 1];

            if (e.code === 'Tab') {
              if (e.shiftKey)
              /* shift + tab */
              {
                // if this is the first item, move to the last item
                isFirstTabStop && lastTabStop.focus();
              } else
              /* tab */
              {
                // if this is the last item, go back to the first item
                isLastTabStop && firstTabStop.focus();
              } // close nav menu on Escape button press

            } else if (e.code === 'Escape') {
              this.toggleNavMenu();
            } // get current active element


            const activeEl = document.activeElement; // check if last item or not

            isLastTabStop = activeEl === lastTabStop ? true : false; // check if first item or not

            isFirstTabStop = activeEl === firstTabStop ? true : false;
          }
        });
      },

      // apply pan effect hero image
      heroImgPanEffect() {
        const parent = this.$refs.heroSection; // return if disabled

        if (!parent || !parent.getAttribute('data-paneffect')) {
          return;
        }

        const layer1 = parent.querySelectorAll('.layer')[0];
        const layer2 = parent.querySelectorAll('.layer')[1];
        parent.addEventListener('mousemove', e => {
          const x = (e.x - parent.getBoundingClientRect().x) / parent.offsetWidth * 100;
          const y = (e.y - parent.getBoundingClientRect().y) / parent.offsetHeight * 100;
          parent.classList.add('parallax-animation');
          layer1.setAttribute('style', `transform-origin: ${x}vw ${y}vh;`);
          layer2.setAttribute('style', `transform-origin: ${x}vw ${y}vh;`);
        });
      },

      // scrolling options
      scrollingOptions() {
        const scrollPosition = window.pageYOffset; // check for current scroll position to minimize the header

        this.isHeaderBig = scrollPosition >= this.startMinimizingHeaderAt ? false : true; // check for current scroll position to toggle the header

        this.isHeaderHidden = scrollPosition > 100 && scrollPosition > this.lastScrollPosition ? true : false;
        this.lastScrollPosition = scrollPosition;
      },

      // scroll to top
      scrollToTop() {
        window.scroll({
          top: 0,
          behavior: 'smooth'
        });
      },

      // initialize the first displayed type of skills
      initSkillsFirstType() {
        const skillsSwitchBtn = this.$refs.skillsSwitchBtn; // return if disabled

        if (!skillsSwitchBtn) {
          return;
        }

        this.skillsType = skillsSwitchBtn.querySelector('input').value;
      },

      // initialize VanillaTilt library in portfolio section
      initializeTilt() {
        const portfolioItems = this.$refs.portfolioItems; // return if disabled

        if (!portfolioItems) {
          return;
        }

        VanillaTilt.init(portfolioItems.querySelectorAll('.portfolio-item'), {
          max: 8,
          speed: 400,
          glare: true,
          'max-glare': 0.3
        });
      },

      // get portfolio items
      getPortfolioItems() {
        const itemsArr = this.allPortfolioItems.filter(item => {
          const urlParams = new URLSearchParams(window.location.search);
          const tax = urlParams.get('tax');

          if (tax) {
            if (tax === 'cat') {
              const cat = urlParams.get('cat');
              this.portfolioArchiveName = cat;
              return item.category === cat;
            } else if (tax === 'tools') {
              const tool = urlParams.get('tools');
              this.portfolioArchiveName = tool;
              return item.tools.includes(tool);
            }
          } else {
            return this.currentFilter === 'All' || item.category === this.currentFilter;
          }
        }).slice(this.filteredPortfolioItems.length, this.portfolioItemsPage * this.itemsPerPage); // check if have works or not

        if (itemsArr.length) {
          this.portfolioItems.push(...itemsArr);
          this.$nextTick(() => {
            // reinitialize VanillaTilt for new items
            this.portfolioItemsPage > 1 && this.initializeTilt(); // Forces the ScrollTrigger instance to re-calculate its start and end values

            setTimeout(() => ScrollTrigger.refresh(), 500);
          });
          this.portfolioItemsPage++;
        } else {
          // show message "No works" to the user
          this.setNotify({
            className: 'danger',
            msg: this.$refs.portfolioItems.getAttribute('data-no-works-msg'),
            time: 3000
          });
        }
      },

      // filter portfolio items
      filterPortfolioItems(filter) {
        this.currentFilter = filter;
        this.portfolioItemsPage = 1;

        if (this.filteredPortfolioItems.length) {
          this.$nextTick(() => {
            // reinitialize VanillaTilt for new items
            this.portfolioItemsPage > 1 && this.initializeTilt(); // Forces the ScrollTrigger instance to re-calculate its start and end values

            setTimeout(() => ScrollTrigger.refresh(), 500);
          });
        } else {
          // get new portfolio items
          this.getPortfolioItems();
        }
      },

      // contact form validation
      contactFormValidation() {
      },

      // show messages by toast notifications
      setNotify ({ id, className, msg, time }) {
        const notify = {
          id: id || `${Date.now()}${this.notifications.length}`,
          className,
          msg,
          time
        };

        if (id) {
          !this.notifications.some(e => e.id === id) && this.notifications.push(notify);
        } else {
          this.notifications.push(notify);
        } // remove this notification from the array after (n) seconds


        time && setTimeout(() => this.dismissNotify(notify.id), time);
      },

      // dismiss the notifications
      dismissNotify(id) {
        const index = this.notifications.findIndex(notify => notify.id === id);
        index > -1 && this.notifications.splice(index, 1);
      },

      // add ajax loading spinner
      startLoading() {
        this.ajaxLoading.push(true);
      },

      // remove ajax loading spinner
      endLoading() {
        this.ajaxLoading.pop();
      }

    },
    computed: {
      // flag to toggle ajax loading spinner
      isAjaxLoading() {
        return this.ajaxLoading.some(state => state === true);
      },

      // get the total years of experience
      experienceYears() {
        return new Date(Date.now() - new Date(String(this.careerStartDate))).getFullYear() - 1970;
      },

      // split experience items into chunks of 3 items
      experienceChunks() {
        return [...Array(Math.floor((this.experienceItems.length - 1) / 3))];
      },

      // filtered portfolio items
      filteredPortfolioItems() {
        const urlParams = new URLSearchParams(window.location.search);
        const tax = urlParams.get('tax');

        if (tax) {
          return this.portfolioItems;
        } else {
          return this.portfolioItems.filter(item => this.currentFilter === 'All' || item.category === this.currentFilter);
        }
      },

      // get single portfolio item
      getSinglePortfolioItem() {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        return this.allPortfolioItems.find(item => item.id == id);
      },

      // get the total years of copyright
      copyrightDate() {
        const yearsDuration = new Date(new Date() - new Date(String(this.copyrightStartDate))).getFullYear() - 1970;
        return yearsDuration === 0 ? this.copyrightStartDate : `${this.copyrightStartDate} - ${this.copyrightStartDate + yearsDuration}`;
      }

    },
    directives: {
      // clone directive
      clone: {
        mounted(el) {
          el.parentNode.insertBefore(el.cloneNode(true), el.nextSibling);
        }

      },
      // add stagger delay to children elements
      staggerdelay: {
        mounted(el, binding) {
          [...el.children].forEach((child, i) => {
            child.setAttribute('style', `animation-delay: ${(i + 1) * (binding.value || 100)}ms`);
          });
        }

      },
      // tooltip directive
      tooltip: {
        mounted(el, binding) {
          el.classList.add('has-tooltip');
          el.insertAdjacentHTML('beforeend', `<div class="custom-tooltip custom-tooltip-${binding.value.dir}">${binding.value.text}</div>`);
        }

      }
    }
  });
  app.mount('#app');

})();