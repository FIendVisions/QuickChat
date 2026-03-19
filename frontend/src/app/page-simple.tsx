// 简单的测试页面

export default function SimplePage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>QuickChat 测试页面</h1>
      <p>如果你能看到这个页面，说明Next.js正在工作。</p>
      
      <div style={{ marginTop: '20px' }}>
        <h2>测试项目：</h2>
        <ul>
          <li>✅ Next.js 服务器运行中</li>
          <li>✅ 页面渲染正常</li>
          <li>✅ 基本路由工作</li>
        </ul>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h2>当前状态：</h2>
        <p>Token: {typeof window !== 'undefined' ? localStorage.getItem('token') || '未设置' : '服务器端渲染'}</p>
        <p>UserId: {typeof window !== 'undefined' ? localStorage.getItem('userId') || '未设置' : '服务器端渲染'}</p>
        <p>Username: {typeof window !== 'undefined' ? localStorage.getItem('username') || '未设置' : '服务器端渲染'}</p>
      </div>

      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={() => {
            localStorage.setItem('token', 'test-token');
            localStorage.setItem('userId', 'test-user-123');
            localStorage.setItem('username', '测试用户');
            alert('登录信息已设置，请刷新页面');
            window.location.reload();
          }}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
        >
          设置测试登录信息
        </button>
      </div>
    </div>
  );
}
