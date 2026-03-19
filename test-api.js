// 测试前端 API 调用是否正常工作

const API_URL = 'http://localhost:3001';

async function testChannelAPI() {
  console.log('=== 测试频道 API ===');

  // 测试 1: 获取所有频道
  console.log('\n1. 测试获取所有频道...');
  try {
    const response = await fetch(`${API_URL}/channels`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    console.log(`✓ 成功获取 ${data.channels.length} 个频道:`);
    data.channels.forEach(ch => {
      console.log(`  - ${ch.name} (${ch.type}) [ID: ${ch.id.substring(0, 8)}...]`);
    });
  } catch (error) {
    console.log(`✗ 失败: ${error.message}`);
    return false;
  }

  // 测试 2: 获取单个频道详情
  console.log('\n2. 测试获取频道详情...');
  try {
    const channelId = '96bd9a8a-dc78-4d15-825e-d6464f068694'; // 游戏大厅
    const response = await fetch(`${API_URL}/channels/${channelId}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    console.log(`✓ 成功获取频道详情: ${data.name}`);
    console.log(`  描述: ${data.description || '无'}`);
    console.log(`  参与人数: ${data.participantCount}`);
  } catch (error) {
    console.log(`✗ 失败: ${error.message}`);
    return false;
  }

  // 测试 3: 创建新频道
  console.log('\n3. 测试创建新频道...');
  try {
    const newChannelData = {
      name: `测试频道_${Date.now()}`,
      type: 'PUBLIC',
      description: '这是一个测试频道'
    };

    const response = await fetch(`${API_URL}/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newChannelData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const newChannel = await response.json();
    console.log(`✓ 成功创建频道: ${newChannel.name}`);
    console.log(`  频道ID: ${newChannel.id}`);
    console.log(`  频道类型: ${newChannel.type}`);

    // 测试 4: 加入频道
    console.log('\n4. 测试加入频道...');
    try {
      const joinResponse = await fetch(`${API_URL}/channels/${newChannel.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!joinResponse.ok) {
        const errorData = await joinResponse.json();
        throw new Error(`HTTP ${joinResponse.status}: ${JSON.stringify(errorData)}`);
      }

      const joinResult = await joinResponse.json();
      console.log(`✓ 成功加入频道: ${joinResult.channelName}`);
      console.log(`  当前参与人数: ${joinResult.participantCount}`);
    } catch (error) {
      console.log(`✗ 加入失败: ${error.message}`);
    }

    // 测试 5: 搜索刚创建的频道
    console.log('\n5. 测试搜索频道...');
    try {
      const searchResponse = await fetch(`${API_URL}/channels/${newChannel.id}`);
      if (!searchResponse.ok) {
        throw new Error(`HTTP ${searchResponse.status}`);
      }
      const foundChannel = await searchResponse.json();
      console.log(`✓ 成功找到频道: ${foundChannel.name}`);
    } catch (error) {
      console.log(`✗ 搜索失败: ${error.message}`);
    }

  } catch (error) {
    console.log(`✗ 创建失败: ${error.message}`);
    return false;
  }

  console.log('\n=== 所有测试完成 ===');
  return true;
}

// 运行测试
testChannelAPI().then(success => {
  if (success) {
    console.log('\n✓ API 集成测试通过！');
  } else {
    console.log('\n✗ API 集成测试失败！');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('\n✗ 测试出错:', error);
  process.exit(1);
});
