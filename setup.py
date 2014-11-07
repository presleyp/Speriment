from setuptools import setup

setup(name='speriment',
      version='0.1',
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
      scripts=['bin/speriment-output'],
      include_package_data=True,
      zip_safe=False)
