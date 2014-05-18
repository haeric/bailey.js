#!/usr/local/bin/python
import sqlite3

db = sqlite3.connect('bailey.docset/Contents/Resources/docSet.dsidx')
cur = db.cursor()

try:
    cur.execute('DROP TABLE searchIndex;')
except:
    pass

cur.execute('CREATE TABLE searchIndex(id INTEGER PRIMARY KEY, name TEXT, '
            'type TEXT, path TEXT);')

cur.execute('CREATE UNIQUE INDEX anchor ON searchIndex (name, type, path);')

docpath = 'bailey.docset/Contents/Resources/Documents'

index = (
    ('Usage', 'Guide', 'dash/usage.html'),
    ('parseString', 'Function', 'dash/usage.html'),
    ('parseFiles', 'Function', 'dash/usage.html'),
    ('Options', 'Guide', 'dash/usage.html'),
    ('Installation', 'Guide', 'dash/installation.html'),
    ('Examples', 'Sample', 'dash/examples.html'),
    ('Datatypes', 'Sample', 'dash/examples.html#datatypes'),
    ('If-statements', 'Sample', 'dash/examples.html#If-statements'),
    ('Loops', 'Sample', 'dash/examples.html#loops'),
    ('Classes', 'Sample', 'dash/examples.html#classes'),
    ('Comments', 'Sample', 'dash/examples.html#comments'),
)

for (name, type_, path) in index:
    cur.execute('INSERT OR IGNORE INTO searchIndex(name, type, path) '
                'VALUES (?,?,?)', (name, type_, path))
db.commit()
db.close()
