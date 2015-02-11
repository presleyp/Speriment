from setuptools import setup

setup(name='speriment',
      version='0.5.1',
      description='Making experiments easier to express',
      url='http://github.com/presleyp/speriment',
      author='Presley Pizzo',
      author_email='ppizzo@linguist.umass.edu',
      license='GPL 2',
      classifiers=[
          'Programming Language :: Python :: 2.7'
      ],
      keywords=['experiments psychology linguistics'],
      packages=['speriment'],
      package_data={'speriment': ['sperimentschema.json']},
      scripts=['bin/speriment-output'],
      install_requires=['jsonschema'],
      include_package_data=True,
      zip_safe=False)
