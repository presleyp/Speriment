from setuptools import setup, find_packages

setup(name='speriment',
      version='0.8.2',
      description='Making experiments easier to express',
      url='http://github.com/presleyp/speriment',
      author='Presley Pizzo',
      author_email='ppizzo@linguist.umass.edu',
      license='GPL 2',
      classifiers=[
          'Programming Language :: Python :: 2.7'
      ],
      keywords=['experiments psychology linguistics'],
      packages=find_packages(exclude=['contrib', 'docs', 'tests']),
      package_data={'speriment.components': ['sperimentschema.json']},
      scripts=['bin/speriment-output'],
      install_requires=['jsonschema'],
      include_package_data=True,
      zip_safe=False)
