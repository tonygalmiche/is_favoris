# -*- coding: utf-8 -*-

{
  "name" : "InfoSaône - Gestion des favoris pour Odoo 18",
  "version" : "0.1.0",
  "author" : "InfoSaône / Tony Galmiche",
  "category" : "InfoSaône",
  "description": """
InfoSaône - Gestion des favoris pour Odoo 18
""",
  "maintainer": "InfoSaône",
  "website": "http://www.infosaone.com",
  "depends" : [
    'base',
    'web',
    'is_bureau',
  ], 
  "init_xml" : [],            
  "demo_xml" : [
  ],            
  "data" : [
    'security/is_favoris_security.xml',
    'security/ir.model.access.csv',
    'views/is_favoris_views.xml',
  ],   
   'assets': {
        'web.assets_backend': [
            'is_favoris/static/src/js/add_to_favorites_item.js',
            'is_favoris/static/src/xml/add_to_favorites_item.xml',
            'is_favoris/static/src/scss/kanban_view.scss',
        ],
     },
  "installable": True,         
  "active": False,            
  "application": True,
  "license": "AGPL-3",
}


