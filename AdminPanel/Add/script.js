async function UpdateFile(type, gitToken, newContent) {

    const response = await fetch(`https://api.github.com/repos/MIbnEKhalid/fff/contents/Assets/${type}.json`, {
        method: 'GET',
        headers: {
            'Authorization': `token ${gitToken}`
        }
    });

    if (!response.ok) {
        alert('Error fetching file data.');
        return;
    }

    const fileData = await response.json();
    const currentContent = JSON.parse(atob(fileData.content));
    const sha = fileData.sha;

    // Append new content to the current content
    currentContent.push(JSON.parse(newContent));
    const updatedContent = JSON.stringify(currentContent, null, 2);
    const base64UpdatedContent = btoa(unescape(encodeURIComponent(updatedContent)));

    const updateResponse = await fetch(`https://api.github.com/repos/MIbnEKhalid/fff/contents/Assets/${type}.json`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: `Append data to ${type}.json`,
            content: base64UpdatedContent,
            sha: sha
        })
    });

    if (updateResponse.ok) {
        alert('File updated successfully!');
    } else {
        alert('Error updating file.');
    }
}
