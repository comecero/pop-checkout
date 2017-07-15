module.exports = function (grunt) {

    /*  Load tasks  */
    require('load-grunt-tasks')(grunt);

    /*  Configure project  */
    grunt.initConfig({

        nggettext_extract: {
            pot: {
                files: {
                    '../popup-cart/languages/template/template.pot': ['../popup-cart/**/*.html', '../popup-cart/app/**/*.html', '../cart/dist/js/kit.js', '../popup-cart/app/**/*.js']
                }
            }
        },

        nggettext_compile: {
            all: {
                options: {
                    format: "json"
                },
                files: [
                    {
                        expand: true,
                        dot: true,
                        src: ["../popup-cart/languages/**/*.po", "!../popup-cart/languages/template/*"],
                        ext: ".json"
                    }
                ]
            },
        }

    });

    // Allows to update modified files only.
    grunt.loadNpmTasks('grunt-angular-gettext');

    /*  Register tasks  */
    grunt.registerTask('default', ['nggettext_extract', 'nggettext_compile']);

};