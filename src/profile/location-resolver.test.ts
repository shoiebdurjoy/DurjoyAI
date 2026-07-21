import { describe, it } from 'node:test';
import assert from 'node:assert';
import { LocationResolverService } from './location-resolver.service';

describe('Location Resolver Service Unit Tests', () => {
  const resolver = new LocationResolverService();

  it('should resolve university location for university keywords', async () => {
    const loc1 = await resolver.resolveTargetLocation('how is the weather at university');
    assert.strictEqual(loc1.area, 'Merul Badda');
    assert.strictEqual(loc1.city, 'Dhaka');

    const loc2 = await resolver.resolveTargetLocation('traffic near brac campus');
    assert.strictEqual(loc2.area, 'Merul Badda');
  });

  it('should resolve home location by default or for home keywords', async () => {
    const loc1 = await resolver.resolveTargetLocation('will it rain today');
    assert.strictEqual(loc1.area, 'Uttara');
    assert.strictEqual(loc1.city, 'Dhaka');

    const loc2 = await resolver.resolveTargetLocation('weather near my house');
    assert.strictEqual(loc2.area, 'Uttara');
  });

  it('should expand location-implicit queries into explicit search queries', async () => {
    const q1 = await resolver.expandSearchQuery('will it rain today');
    assert.strictEqual(q1, 'weather today Uttara Dhaka Bangladesh');

    const q2 = await resolver.expandSearchQuery("how's the weather at university");
    assert.strictEqual(q2, 'weather BRAC University Merul Badda Dhaka');

    const q3 = await resolver.expandSearchQuery('traffic to university');
    assert.strictEqual(q3, 'traffic Uttara to BRAC University Merul Badda Dhaka');

    const q4 = await resolver.expandSearchQuery('should i leave now');
    assert.strictEqual(q4, 'traffic Uttara to BRAC University Merul Badda Dhaka');
  });
});
