CDK = npx cdk

nop:

synth:
	$(CDK) synth --yes --quiet

diff:
	$(CDK) diff --yes --quiet --app cdk.out/

deploy:
	$(CDK) deploy --yes --quiet --app cdk.out/
